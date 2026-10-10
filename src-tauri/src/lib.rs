//! BetterViewer desktop: the web app (../src) in a native window, plus what a
//! browser page can't do on its own: open files by path ("Open with", file
//! associations, drag and drop), browse the other images of their folder and
//! save next to them. The page side is src/lib/desktop.ts.

use std::cmp::Ordering;
use std::iter::Peekable;
use std::path::{Path, PathBuf};
use std::str::Chars;
use std::sync::Mutex;

use serde::Serialize;
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_window_state::StateFlags;

/// Formats the viewer opens (see ACCEPTED_TYPES in src/lib/image.ts).
const IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "jfif", "webp", "gif", "avif", "bmp", "ico"];

fn is_image(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| IMAGE_EXTENSIONS.contains(&e.to_ascii_lowercase().as_str()))
}

fn path_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn file_name(path: &Path) -> String {
    path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default()
}

/// File Explorer's order: ignores case, compares runs of digits by value
/// ("photo 2" before "photo 10").
fn natural_cmp(a: &str, b: &str) -> Ordering {
    /// The run of digits at the front, without leading zeros.
    fn take_number(it: &mut Peekable<Chars<'_>>) -> String {
        let mut digits = String::new();
        while let Some(c) = it.peek().copied().filter(char::is_ascii_digit) {
            digits.push(c);
            it.next();
        }
        digits.trim_start_matches('0').to_string()
    }

    let (mut a, mut b) = (a.chars().peekable(), b.chars().peekable());
    loop {
        match (a.peek().copied(), b.peek().copied()) {
            (None, None) => return Ordering::Equal,
            (None, Some(_)) => return Ordering::Less,
            (Some(_), None) => return Ordering::Greater,
            (Some(x), Some(y)) if x.is_ascii_digit() && y.is_ascii_digit() => {
                let (x, y) = (take_number(&mut a), take_number(&mut b));
                let order = x.len().cmp(&y.len()).then_with(|| x.cmp(&y));
                if order != Ordering::Equal {
                    return order;
                }
            }
            (Some(x), Some(y)) => {
                let order = x.to_lowercase().cmp(y.to_lowercase());
                if order != Ordering::Equal {
                    return order;
                }
                a.next();
                b.next();
            }
        }
    }
}

/// The images among command-line arguments (how Explorer's "Open with" and
/// file associations hand files over).
fn image_args(args: impl IntoIterator<Item = String>, cwd: &Path) -> Vec<String> {
    args.into_iter()
        .skip(1)
        .filter(|a| !a.starts_with('-'))
        .map(|a| {
            let p = PathBuf::from(a);
            if p.is_absolute() {
                p
            } else {
                cwd.join(p)
            }
        })
        .filter(|p| p.is_file() && is_image(p))
        .map(|p| path_string(&p))
        .collect()
}

/// Files the app was started with, until the page asks for them.
struct LaunchPaths(Mutex<Vec<String>>);

#[derive(Default)]
struct SaveState {
    /// Where the last file was saved: the next Save dialog starts there.
    last_dir: Option<PathBuf>,
    /// Path picked in the Save dialog, waiting for the file's bytes.
    pending: Option<PathBuf>,
}

#[tauri::command]
fn launch_paths(state: State<LaunchPaths>) -> Vec<String> {
    std::mem::take(&mut *state.0.lock().unwrap())
}

#[derive(Serialize)]
struct Folder {
    dir: String,
    files: Vec<String>,
}

/// The images in the folder of `path`, in Explorer's order. The page may then
/// show them by address (asset protocol), for the thumbnail rail.
#[tauri::command]
fn list_folder(app: AppHandle, path: String) -> Result<Folder, String> {
    let path = PathBuf::from(path);
    let dir = path.parent().ok_or("This file has no folder.")?.to_path_buf();
    let mut files: Vec<PathBuf> = std::fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok().map(|e| e.path()))
        .filter(|p| p.is_file() && is_image(p))
        .collect();
    files.sort_by(|a, b| natural_cmp(&file_name(a), &file_name(b)));
    app.asset_protocol_scope()
        .allow_directory(&dir, false)
        .map_err(|e| e.to_string())?;
    Ok(Folder {
        dir: path_string(&dir),
        files: files.iter().map(|p| path_string(p)).collect(),
    })
}

/// The bytes of an image file (sent to the page as an ArrayBuffer).
#[tauri::command]
fn read_image(path: String) -> Result<Response, String> {
    let path = PathBuf::from(path);
    if !is_image(&path) {
        return Err("This file isn't a supported image.".into());
    }
    std::fs::read(&path).map(Response::new).map_err(|e| e.to_string())
}

/// The Open dialog, filtered to images. `None` when cancelled.
#[tauri::command]
async fn pick_image(app: AppHandle, dir: Option<String>) -> Option<String> {
    let mut dialog = app.dialog().file().add_filter("Images", IMAGE_EXTENSIONS);
    if let Some(dir) = dir {
        dialog = dialog.set_directory(dir);
    }
    let picked = dialog.blocking_pick_file()?;
    picked.into_path().ok().map(|p| path_string(&p))
}

/// The Save dialog. The page then sends the bytes with `write_saved_file`,
/// which can only write where the user chose here. `None` when cancelled.
#[tauri::command]
async fn choose_save_path(
    app: AppHandle,
    state: State<'_, Mutex<SaveState>>,
    name: String,
    dir: Option<String>,
) -> Result<Option<String>, String> {
    let start = state.lock().unwrap().last_dir.clone().or(dir.map(PathBuf::from));
    let mut dialog = app.dialog().file().set_file_name(&name);
    if let Some(ext) = Path::new(&name).extension().and_then(|e| e.to_str()) {
        dialog = dialog.add_filter(ext.to_uppercase(), &[ext]);
    }
    if let Some(start) = start {
        dialog = dialog.set_directory(start);
    }
    let Some(picked) = dialog.blocking_save_file() else {
        return Ok(None);
    };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    let mut s = state.lock().unwrap();
    s.last_dir = path.parent().map(Path::to_path_buf);
    s.pending = Some(path.clone());
    Ok(Some(path_string(&path)))
}

/// Write the request body (raw bytes) to the path just picked in the Save dialog.
#[tauri::command]
fn write_saved_file(request: Request<'_>, state: State<'_, Mutex<SaveState>>) -> Result<(), String> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("Expected the file's bytes.".into());
    };
    let path = state.lock().unwrap().pending.take().ok_or("No file was chosen.")?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cwd = std::env::current_dir().unwrap_or_default();
    let launch = image_args(std::env::args(), &cwd);

    tauri::Builder::default()
        // First: a second launch ("Open with" while the app is running) hands
        // its files to this window instead of opening another one.
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            let paths = image_args(args, Path::new(&cwd));
            if !paths.is_empty() {
                let _ = app.emit("open-paths", paths);
            }
        }))
        // Size, position and maximized state; not the decorations, which would
        // bring back the system title bar over the app's own (TitleBar.tsx).
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(StateFlags::all() & !StateFlags::DECORATIONS)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(LaunchPaths(Mutex::new(launch)))
        .manage(Mutex::new(SaveState::default()))
        .invoke_handler(tauri::generate_handler![
            launch_paths,
            list_folder,
            read_image,
            pick_image,
            choose_save_path,
            write_saved_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running BetterViewer");
}

#[cfg(test)]
mod tests {
    use super::natural_cmp;

    #[test]
    fn sorts_like_explorer() {
        let mut names = vec!["img10.png", "IMG2.png", "img1.png", "a.jpg", "img02b.png"];
        names.sort_by(|a, b| natural_cmp(a, b));
        assert_eq!(names, ["a.jpg", "img1.png", "IMG2.png", "img02b.png", "img10.png"]);
    }
}

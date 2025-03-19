import React from "react";
import BetterViewerLogo from "./BetterViewerLogo";

const About = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <BetterViewerLogo width={150} height={150} />
      <h1 className="text-4xl font-bold text-white text-center">
        BetterViewer <span className="text-blue-500 text-sm">v2.0.2</span>
      </h1>
      <h3 className="text-lg text-white text-center">
        Fast, Simple & Easy Image Viewer
      </h3>
      <p className="text-white mt-4">
        BetterViewer makes image viewing faster, easier, and more fun.
      </p>
      <p className="text-white mt-2">
        Designed as a better alternative to the built-in image viewer in
        Chrome-based browsers, BetterViewer lets you:
        <br />✅ Zoom & Pan with ease
        <br />✅ Edit & Enhance images instantly
        <br />✅ Use handy keyboard shortcuts for quick navigation
        <br />and much more!
      </p>

      <p className="text-white mt-2">
        ⭐️ If you find BetterViewer useful, don't forget to leave a star!
      </p>
      <a href="https://github.com/Ademking/BetterViewer" target="_blank">
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-4 rounded mt-2">
          Star on GitHub 🌟
        </button>
      </a>
      <p className="text-white mt-2">
        Created with ❤️🍪 by{" "}
        <a
          href="https://github.com/Ademking"
          target="_blank"
          className="font-semibold underline"
        >
          Adem Kouki
        </a>
      </p>
    </div>
  );
};

export default About;

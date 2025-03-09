import { useState, useEffect } from "react";

export const useSupports = (supportCondition: string) => {
  const [checkResult, setCheckResult] = useState<boolean | undefined>();

  useEffect(() => {
    setCheckResult(CSS.supports(supportCondition));
  }, [supportCondition]);

  return checkResult;
};

export const useDetectBrowser = () => {
  const hacksMapping = {
    firefox: "-moz-appearance:none",
    safari: "-webkit-hyphens:none",
    chrome:
      'not (-webkit-hyphens:none) and not (-moz-appearance:none) and (list-style-type:"*")',
  };
  const isFirefox = useSupports(hacksMapping.firefox);
  const isChrome = useSupports(hacksMapping.chrome);
  const isSafari = useSupports(hacksMapping.safari);

  return [
    { browser: "firefox", condition: isFirefox },
    { browser: "chromium based", condition: isChrome },
    { browser: "safari", condition: isSafari },
  ].find(({ condition }) => condition)?.browser as
    | "firefox"
    | "chromium based"
    | "safari"
    | undefined;
};

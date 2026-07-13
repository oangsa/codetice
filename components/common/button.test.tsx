import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Button, getButtonText } from "@/components/common/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

describe("common Button", () => {
  test("falls back to rendered button text for its tooltip", async () => {
    const source = await Bun.file(new URL("./button.tsx", import.meta.url)).text();

    expect(getButtonText(<><span>Clone</span> question</>)).toBe("Clone question");
    expect(source).toContain("const tooltipContent = disableTooltip ? undefined : tooltip ?? fallbackText;");
    expect(source).toContain("<TooltipContent>{tooltipContent}</TooltipContent>");
  });

  test("can suppress fallback tooltips for controls that should stay quiet", async () => {
    const source = await Bun.file(new URL("./button.tsx", import.meta.url)).text();

    expect(source).toContain("disableTooltip?: boolean;");
    expect(source).toContain("const tooltipContent = disableTooltip ? undefined : tooltip ?? fallbackText;");
  });

  test("remains composable as a dialog trigger", () => {
    const markup = renderToStaticMarkup(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open clone dialog</Button>
        </DialogTrigger>
      </Dialog>,
    );

    expect(markup).toContain("Open clone dialog");
    expect(markup).toContain("<button");
  });

  test("uses an explicit tooltip as an icon action's accessible label", () => {
    const markup = renderToStaticMarkup(
      <Button size="icon" tooltip="Clone question"><span /></Button>,
    );

    expect(markup).toContain('aria-label="Clone question"');
  });

  test("allows segmented controls to override the ghost hover background and size", () => {
    const markup = renderToStaticMarkup(
      <Button
        disableTooltip
        variant="ghost"
        size="sm"
        className="h-[36px] bg-transparent hover:bg-transparent focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-offset-0"
      >
        Samples
      </Button>,
    );

    expect(markup).toContain("h-[36px]");
    expect(markup).toContain("hover:bg-transparent");
    expect(markup).toContain("focus-visible:ring-1");
    expect(markup).toContain("focus-visible:ring-inset");
    expect(markup).toContain("focus-visible:ring-offset-0");
    expect(markup).not.toContain("h-9");
    expect(markup).not.toContain("hover:bg-accent");
    expect(markup).not.toContain("focus-visible:ring-offset-2");
  });
});

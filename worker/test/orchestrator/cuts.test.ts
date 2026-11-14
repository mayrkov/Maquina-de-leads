import { describe, expect, it } from "vitest";
import { buildRenderPayload, wordsInWindow } from "../../src/orchestrator/cuts/render.js";

describe("render arguments", () => {
  it("builds the render payload with hysteresis, framing, captions and the words of each window", () => {
    const words = [{ word: "x", start: 9, end: 9.5 }, { word: "y", start: 10, end: 10.4 }, { word: "z", start: 44.8, end: 45.02 }];
    const jobs = [{ start: 10, end: 45, out: "/o/a.mp4", words: wordsInWindow(words, 10, 45) }];
    expect(jobs[0]?.words.map((w) => w.word)).toEqual(["y", "z"]);
    const payload = buildRenderPayload({ source: "/s.mp4", framing: "open", captions: { wordsPerCue: 3, color: "#FFE11A" }, jobs }, "/m/yunet.onnx", "ffmpeg");
    expect(payload).toMatchObject({ source: "/s.mp4", yunet: "/m/yunet.onnx", framing: "open", holdSeconds: 1.2, captions: { wordsPerCue: 3, color: "#FFE11A" } });
    expect((payload.jobs as unknown[]).length).toBe(1);
  });
});

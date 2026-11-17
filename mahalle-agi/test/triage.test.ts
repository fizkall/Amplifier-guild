import { describe, expect, it } from "vitest";
import { ENV, FLAGS } from "../src/protocol";
import { triage } from "../src/triage";

describe("triage", () => {
  it("örnek panik mesajı", () => {
    const r = triage("Bacağım dolabın altında, çok kanıyor, yanımda 4 yaşında oğlum var, nefes alıyor");
    expect(r.flags & FLAGS.SIKISMA).toBeTruthy();
    expect(r.flags & FLAGS.KANAMA).toBeTruthy();
    expect(r.flags & FLAGS.COCUK).toBeTruthy();
    expect(r.people).toBe(2);
    expect(r.urgency).toBe(5);
  });
  it("kişi sayısı rakam ve yazıyla", () => {
    expect(triage("3 kişiyiz mahsur kaldık").people).toBe(3);
    expect(triage("beş kişi bodrumdayız").people).toBe(5);
  });
  it("çevre riskleri", () => {
    const r = triage("gaz kokusu var, çok üşüyoruz");
    expect(r.env & ENV.GAZ).toBeTruthy();
    expect(r.env & ENV.SOGUK).toBeTruthy();
  });
  it("kanepe/kanal kanama sayılmaz", () => {
    expect(triage("kanepenin yanındayım kanal tarafı").flags & FLAGS.KANAMA).toBe(0);
  });
  it("iyiyim → düşük aciliyet", () => {
    expect(triage("iyiyim, dışarıdayım").urgency).toBe(1);
  });
});

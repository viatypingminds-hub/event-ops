function css(str) {
  const obj = {};
  (str || "").split(";").forEach((rule) => {
    const idx = rule.indexOf(":");
    if (idx === -1) return;
    const prop = rule.slice(0, idx).trim();
    const val = rule.slice(idx + 1).trim();
    if (!prop || !val) return;
    const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    obj[camel] = val;
  });
  return obj;
}

export const metadata = {
  title: "Event Ops — Masterclass"
};

export default function LandingPage() {
  return (
    <div style={css("min-height: 100vh; background: #f6f7f9; font-family: Roboto, Helvetica, Arial, sans-serif; color: #1a1d21;")}>
      <header style={css("background: #ffffff; border-bottom: 1px solid #e3e6ea; padding: 0 20px;")}>
        <div style={css("max-width: 1000px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 16px 0;")}>
          <div style={css("display: flex; align-items: center; gap: 12px;")}>
            <div style={css("width: 36px; height: 36px; border-radius: 9px; background: #a8261f; color: #fff; display: grid; place-items: center; font-size: 15px; font-weight: 500;")}>EO</div>
            <div style={css("font-size: 16px; font-weight: 500;")}>Event Ops</div>
          </div>
          <a href="/login" style={css("font-size: 13.5px; font-weight: 500; color: #6b7480;")}>Sign in</a>
        </div>
      </header>

      <main style={css("max-width: 720px; margin: 0 auto; padding: 72px 20px 96px; text-align: center;")}>
        <div style={css("font-size: 12.5px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #a8261f;")}>Free training event</div>
        <h1 style={css("font-size: 34px; font-weight: 500; letter-spacing: -0.5px; margin: 14px 0 0;")}>Masterclass</h1>
        <p style={css("font-size: 15.5px; line-height: 1.6; color: #4a525b; margin: 18px auto 0; max-width: 520px;")}>
          A hands-on training session, hosted in person across several dates this September.
          Sign up to pick a date that works for you — seats are limited.
        </p>

        <div style={css("margin-top: 34px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;")}>
          <a
            href="/register"
            style={css("display: inline-flex; align-items: center; height: 46px; padding: 0 26px; border: 1px solid #a8261f; background: #a8261f; color: #fff; border-radius: 8px; font-size: 14.5px; font-weight: 500; text-decoration: none;")}
          >
            Register for a session
          </a>
        </div>

        <div style={css("margin-top: 56px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; text-align: left;")}>
          <div style={css("background: #fff; border: 1px solid #e3e6ea; border-radius: 12px; padding: 18px 20px;")}>
            <div style={css("font-size: 12px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480;")}>Format</div>
            <div style={css("font-size: 14px; margin-top: 6px; color: #33393f;")}>In person, 3.5 hours</div>
          </div>
          <div style={css("background: #fff; border: 1px solid #e3e6ea; border-radius: 12px; padding: 18px 20px;")}>
            <div style={css("font-size: 12px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480;")}>Cost</div>
            <div style={css("font-size: 14px; margin-top: 6px; color: #33393f;")}>Free — no payment collected</div>
          </div>
          <div style={css("background: #fff; border: 1px solid #e3e6ea; border-radius: 12px; padding: 18px 20px;")}>
            <div style={css("font-size: 12px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: #6b7480;")}>Dates</div>
            <div style={css("font-size: 14px; margin-top: 6px; color: #33393f;")}>Several September dates — pick one when you register</div>
          </div>
        </div>
      </main>
    </div>
  );
}

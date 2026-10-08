import { useEffect, useRef, useState, type FormEvent } from "react";

const SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:30", "14:00", "15:30", "17:00"];
const SEATING = ["Window", "Counter", "Courtyard"];

const isoDay = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

type Booking = { name: string; email: string; date: string; time: string; guests: number; seating: string };

export const ReserveDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const ref = useRef<HTMLDialogElement>(null);
  const [guests, setGuests] = useState(2);
  const [done, setDone] = useState<Booking | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.classList.add("is-modal");
    }
    if (!open && d.open) d.close();
  }, [open]);

  const close = () => {
    document.documentElement.classList.remove("is-modal");
    onClose();
    window.setTimeout(() => {
      setDone(null);
      setErrors({});
    }, 300);
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const b: Booking = {
      name: String(f.get("name") || "").trim(),
      email: String(f.get("email") || "").trim(),
      date: String(f.get("date") || ""),
      time: String(f.get("time") || ""),
      guests,
      seating: String(f.get("seating") || SEATING[0]),
    };
    const errs: Record<string, string> = {};
    if (b.name.length < 2) errs.name = "Tell us who to expect.";
    if (!/^\S+@\S+\.\S+$/.test(b.email)) errs.email = "We need a valid email for the confirmation.";
    if (!b.date) errs.date = "Pick a day.";
    if (!b.time) errs.time = "Pick a time.";
    setErrors(errs);
    if (Object.keys(errs).length === 0) setDone(b);
  };

  const today = isoDay(new Date());
  const max = isoDay(new Date(Date.now() + 60 * 864e5));

  return (
    <dialog ref={ref} className="dialog" data-tour-ui onClose={close} onCancel={close} aria-labelledby="reserve-title">
      <button className="dialog__close" onClick={close} aria-label="Close">
        ×
      </button>
      {done ? (
        <div className="dialog__done">
          <p className="eyebrow">Table held</p>
          <h2 id="reserve-title">
            See you soon, <em>{done.name.split(" ")[0]}.</em>
          </h2>
          <p>
            {done.guests} {done.guests === 1 ? "guest" : "guests"} · {done.seating.toLowerCase()} ·{" "}
            {new Date(`${done.date}T00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} at{" "}
            {done.time}.
          </p>
          <p className="dialog__fine">Demo site: no booking was made and nothing was sent.</p>
          <button className="btn btn--gold" onClick={close}>
            Back to the film
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <p className="eyebrow">Reservations</p>
          <h2 id="reserve-title">
            Reserve a <em>table.</em>
          </h2>
          <div className="field">
            <label htmlFor="r-name">Name</label>
            <input id="r-name" name="name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby="e-name" />
            <small id="e-name">{errors.name}</small>
          </div>
          <div className="field">
            <label htmlFor="r-email">Email</label>
            <input id="r-email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby="e-email" />
            <small id="e-email">{errors.email}</small>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="r-date">Day</label>
              <input id="r-date" name="date" type="date" min={today} max={max} defaultValue={today} aria-invalid={!!errors.date} />
              <small>{errors.date}</small>
            </div>
            <div className="field">
              <label htmlFor="r-time">Time</label>
              <select id="r-time" name="time" defaultValue="" aria-invalid={!!errors.time}>
                <option value="" disabled>
                  Choose
                </option>
                {SLOTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <small>{errors.time}</small>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <span className="label" id="g-label">
                Guests
              </span>
              <div className="stepper" role="group" aria-labelledby="g-label">
                <button type="button" onClick={() => setGuests((g) => Math.max(1, g - 1))} aria-label="Fewer guests">
                  −
                </button>
                <output aria-live="polite">{guests}</output>
                <button type="button" onClick={() => setGuests((g) => Math.min(8, g + 1))} aria-label="More guests">
                  +
                </button>
              </div>
            </div>
            <fieldset className="field seating">
              <legend className="label">Seating</legend>
              {SEATING.map((s, i) => (
                <label key={s}>
                  <input type="radio" name="seating" value={s} defaultChecked={i === 0} />
                  <span>{s}</span>
                </label>
              ))}
            </fieldset>
          </div>
          <button className="btn btn--gold btn--block" type="submit">
            Hold my table
          </button>
          <p className="dialog__fine">Demo site: nothing is sent anywhere.</p>
        </form>
      )}
    </dialog>
  );
};

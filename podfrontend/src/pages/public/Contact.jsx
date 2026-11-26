import { Mail, Send } from "lucide-react";

const contactEmail = "rowanhadegu@gmail.com";
const fieldClass =
    "w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/10";

const fields = [
    { name: "name", label: "Full Name", type: "text", autoComplete: "name" },
    { name: "email", label: "Email Address", type: "email", autoComplete: "email" },
    { name: "subject", label: "Subject", type: "text" },
];

function openEmailDraft(event) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const subject = encodeURIComponent(data.get("subject"));
    const body = encodeURIComponent(
        `Name: ${data.get("name")}\nEmail: ${data.get("email")}\n\n${data.get("message")}`
    );

    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
}

export default function Contact() {
    return (
        <section className="mx-auto max-w-5xl px-6 py-16 md:py-20">
            <h1 className="mb-10 text-center text-3xl font-bold sm:text-4xl">
                Get in touch
            </h1>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-powder-light p-8">
                    <Mail aria-hidden="true" className="mb-4 text-orange" size={28} />
                    <div className="self-start rounded-2xl border border-slate-100 bg-powder-light p-8">
                    <h2 className="text-2xl font-bold">Email us</h2>
                    <p className="mb-4 mt-2 text-muted">
                        Have a question about Pesa Pod or need help with your chama?
                    </p>
                   <a
                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contactEmail)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-orange hover:underline"
                    >
                        {contactEmail}
                    </a>
                </div>
                </div>

                <form
                    onSubmit={openEmailDraft}
                    className="space-y-4 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm"
                >
                    <h2 className="text-2xl font-bold">Send us a message</h2>

                    {fields.map(({ name, label, type, autoComplete }) => (
                        <label key={name} className="block text-sm font-semibold">
                            {label}
                            <input
                                className={`mt-2 ${fieldClass}`}
                                name={name}
                                type={type}
                                autoComplete={autoComplete}
                                required
                            />
                        </label>
                    ))}

                    <label className="block text-sm font-semibold">
                        Message
                        <textarea className={`mt-2 ${fieldClass}`} name="message" rows={4} required />
                    </label>

                    <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange px-6 py-3 font-semibold text-white hover:bg-orange/90"
                    >
                        Open email draft <Send aria-hidden="true" size={18} />
                    </button>
                </form>
            </div>
        </section>
    );
}

import { useState } from "react";
import { createChama } from "../../api/chamas";

function CreateChama({ onCreated, onCancel }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    let createdChama;

    try {
        createdChama = await createChama({
            name: name.trim(),
            description: description.trim(),
        });
    } catch (error) {
        const responseData = error.response?.data;

        if (responseData?.detail) {
            setError(responseData.detail);
        } else if (responseData && typeof responseData === "object") {
            setError(
                Object.values(responseData)
                    .flat()
                    .join(" ")
            );
        } else {
            setError("Unable to create chama. Please try again.");
        }

        setLoading(false);
        return;
    }

    setLoading(false);
    onCreated(createdChama);
};
    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-ink">
                    Create a New Chama
                </h3>

                <p className="text-sm text-muted mt-1">
                    Set up your savings group and invite others to join.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label
                        htmlFor="chama-name"
                        className="block text-sm font-medium text-ink mb-2"
                    >
                        Chama Name
                    </label>

                    <input
                        id="chama-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={150}
                        required
                        placeholder="Enter your chama name"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-ink"
                    />

                    <p className="text-xs text-muted mt-1">
                        Maximum 150 characters.
                    </p>
                </div>

                <div>
                    <label
                        htmlFor="chama-description"
                        className="block text-sm font-medium text-ink mb-2"
                    >
                        Description
                        <span className="text-muted font-normal"> (Optional)</span>
                    </label>

                    <textarea
                        id="chama-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        placeholder="What is this chama about?"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-ink resize-none"
                    />
                </div>

                <div className="bg-powder-light rounded-xl p-4">
                    <p className="text-sm text-ink">
                        You will automatically become the chairperson and
                        first member of this chama.
                    </p>
                </div>

                {error && (
                    <p className="text-sm text-red-600">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-muted hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="px-5 py-2.5 rounded-xl bg-ink text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? "Creating..." : "Create Chama"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CreateChama;

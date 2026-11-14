
import { useEffect, useState } from "react";
import { getChamaRounds } from "../api/cycles";
import { getRoundContributions } from "../api/contributions";

function useTreasurerOverview(cycle) {
    const [round, setRound] = useState(null);
    const [contributions, setContributions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        const fetchOverview = async () => {
            if (!cycle?.id || !cycle?.current_round) {
                setRound(null);
                setContributions([]);
                setLoading(false);
                setError("");
                return;
            }

            setLoading(true);
            setError("");

            try {
                const data = await getChamaRounds(cycle.id);

                const rounds = Array.isArray(data)
                    ? data
                    : data?.results || [];

                const currentRound = rounds.find(
                    (item) =>
                        item.round_number === cycle.current_round
                );

                if (!currentRound) {
                    if (isMounted) {
                        setRound(null);
                        setContributions([]);
                    }
                    return;
                }

                const contributionData = await getRoundContributions(
                    currentRound.id
                );

                const contributionList = Array.isArray(contributionData)
                    ? contributionData
                    : contributionData?.results || [];

                if (isMounted) {
                    setRound(currentRound);
                    setContributions(contributionList);
                }
            } catch (error) {
                if (isMounted) {
                    setError(
                        error.response?.data?.detail ||
                        "Unable to load financial overview."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchOverview();

        return () => {
            isMounted = false;
        };
    }, [cycle?.id, cycle?.current_round]);

    const expectedAmount = contributions.reduce(
        (total, item) => total + Number(item.amount_due || 0),
        0
    );

    const confirmedAmount = contributions
        .filter((item) => item.status === "paid")
        .reduce(
            (total, item) => total + Number(item.amount_due || 0),
            0
        );

    const overdueCount =
        round && new Date(`${round.due_date}T00:00:00`) < new Date(
            new Date().toDateString()
        )
            ? contributions.filter(
                (item) => item.status !== "paid"
            ).length
            : 0;

    return {
        round,
        contributions,
        expectedAmount,
        confirmedAmount,
        overdueCount,
        loading,
        error,
    };
}

export default useTreasurerOverview;

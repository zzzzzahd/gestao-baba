export const useCountdown = (targetDate) => {
  const [countdown, setCountdown] = useState({ d: 0, h: 0, m: 0, s: 0, active: false });

  useEffect(() => {
    let timeoutId;

    const isValidDate =
      targetDate instanceof Date && !isNaN(targetDate.getTime());

    if (!isValidDate) {
      setCountdown({ d: 0, h: 0, m: 0, s: 0, active: false });
      return;
    }

    const update = () => {
      const diff = targetDate.getTime() - Date.now();

      if (diff <= 0) {
        setCountdown({ d: 0, h: 0, m: 0, s: 0, active: false });
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);

      setCountdown({
        d: Math.floor(totalSeconds / 86400),
        h: Math.floor((totalSeconds % 86400) / 3600),
        m: Math.floor((totalSeconds % 3600) / 60),
        s: totalSeconds % 60,
        active: true,
      });

      timeoutId = setTimeout(update, 1000 - (Date.now() % 1000));
    };

    update();
    return () => clearTimeout(timeoutId);
  }, [
    targetDate instanceof Date && !isNaN(targetDate.getTime())
      ? targetDate.toISOString()
      : null
  ]);

  return countdown;
};

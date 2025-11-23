import { useCallback } from "react";

export const useFormatDate = () => {
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const dateFormatted = date.toLocaleDateString("fr-FR", {
      dateStyle: "full",
    });
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    const timeFormatted = `${hours}h ${minutes}min ${seconds}sec`;
    return `${dateFormatted} ${timeFormatted}`;
  }, []);

  return formatDate;
};


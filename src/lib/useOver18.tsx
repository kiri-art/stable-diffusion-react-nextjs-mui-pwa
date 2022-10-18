import React from "react";
import { useGongoUserId, useGongoOne } from "gongo-client-react";
import { differenceInYears } from "date-fns";

export default function useOver18() {
  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );

  return React.useMemo(() => {
    if (user?.dob instanceof Date) {
      const age = differenceInYears(new Date(), user.dob);
      return age >= 18;
    }
    return false;
  }, [user]);
}

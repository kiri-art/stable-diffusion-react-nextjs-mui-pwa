import { differenceInYears } from "date-fns";
import { useGongoOne, useGongoUserId } from "gongo-client-react";
import React from "react";

export default function useOver18() {
  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId }),
  );

  return React.useMemo(() => {
    if (user?.dob instanceof Date) {
      const age = differenceInYears(new Date(), user.dob);
      return age >= 18;
    }
    return false;
  }, [user]);
}

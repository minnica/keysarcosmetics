"use client";

import * as React from "react";
import { Testbed } from "./testbed";

export default function Page() {
  const [scenario, setScenario] = React.useState("overview");

  React.useEffect(() => {
    setScenario(
      new URLSearchParams(window.location.search).get("scenario") ?? "overview",
    );
  }, []);

  return <Testbed scenario={scenario} />;
}

import { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { authenticateSession } from "../utils/session-auth.server";
import { InstantAlerts } from "../components/InstantAlerts";

export const loader = async (args: LoaderFunctionArgs) => {
  // Use optimized session token authentication
  await authenticateSession(args);
  return null;
};

export default function App() {
  return (
    <>
      <InstantAlerts />
      <Outlet />
    </>
  );
}

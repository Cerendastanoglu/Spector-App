import { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { InstantAlerts } from "../components/InstantAlerts";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
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

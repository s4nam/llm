import type { Metadata } from "next";
import PlacementPage from "./placement-page";

export const metadata: Metadata = {
  title: "Tes Penempatan Level",
};

export default function PlacementTestPage() {
  return <PlacementPage />;
}

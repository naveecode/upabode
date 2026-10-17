import { ListingExplorer } from "@/components/ListingExplorer";
import { listings } from "@/data/listings";

export default function HomePage() {
  return <ListingExplorer listings={listings} />;
}

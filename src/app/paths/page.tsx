import { PathList } from "@/components/PathList";
import { LEARNING_PATHS } from "@/lib/guide/paths";

export default function PathsPage() {
  return <PathList paths={LEARNING_PATHS} />;
}

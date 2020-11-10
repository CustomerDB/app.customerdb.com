import { useParams } from "react-router-dom";

const quantapProduction = "rh9LLboBwfHswLmFkjKp";
const quantapStaging = "FgmKrP91hGfYvuKiJ4KO";

export default function FeatureFlags({ children }) {
  const { orgID } = useParams();
  const enabled = orgID === quantapProduction || orgID === quantapStaging;
  return enabled && children;
}

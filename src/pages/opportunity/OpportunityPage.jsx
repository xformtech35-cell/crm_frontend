import ModuleWorkspace from '../../components/module/ModuleWorkspace'
import { useOpportunity } from '../../hooks/useOpportunity'
import { opportunityConfig } from '../moduleConfigs'

export default function OpportunityPage() {
  return <ModuleWorkspace config={opportunityConfig(useOpportunity())} />
}

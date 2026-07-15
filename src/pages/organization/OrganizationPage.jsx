import ModuleWorkspace from '../../components/module/ModuleWorkspace'
import { useOrganization } from '../../hooks/useOrganization'
import { organizationConfig } from '../moduleConfigs'

export default function OrganizationPage() {
  return <ModuleWorkspace config={organizationConfig(useOrganization())} />
}

import ModuleWorkspace from '../../components/module/ModuleWorkspace'
import { useProject } from '../../hooks/useProject'
import { projectConfig } from '../moduleConfigs'

export default function ProjectPage() {
  return <ModuleWorkspace config={projectConfig(useProject())} />
}

import ModuleWorkspace from '../../components/module/ModuleWorkspace'
import { useContact } from '../../hooks/useContact'
import { contactConfig } from '../moduleConfigs'

export default function ContactPage() {
  return <ModuleWorkspace config={contactConfig(useContact())} />
}

import { PanouPrincipal } from './pages/PanouPrincipal';
import { Contacte } from './pages/Contacte';
import { GenericPage } from './pages/GenericPage';

interface ContentRouterProps {
  currentRoute: string;
}

export function ContentRouter({ currentRoute }: ContentRouterProps) {
  switch (currentRoute) {
    case 'panou-principal':
      return <PanouPrincipal />;
    
    case 'contacte':
      return <Contacte />;
    
    case 'activitati':
      return <GenericPage title="Activitati" icon="📋" description="Gestionarea activităților și task-urilor" />;
    
    case 'leads':
      return <GenericPage title="Leads" icon="🎯" description="Managementul lead-urilor și prospects" />;
    
    case 'cereri':
      return <GenericPage title="Cereri" icon="📝" description="Procesarea cererilor și solicitărilor" />;
    
    case 'proprietati':
      return <GenericPage title="Proprietati" icon="🏠" description="Catalogul proprietăților imobiliare" />;
    
    case 'acp':
      return <GenericPage title="ACP" icon="🏢" description="Asociații de coproprietari" />;
    
    case 'anunturi-particulari':
      return <GenericPage title="Anunturi Particulari" icon="📢" description="Anunțuri postate de particulari" />;
    
    case 'ansamburi':
      return <GenericPage title="Ansamburi" icon="🏘️" description="Ansamburi rezidențiale și comerciale" />;
    
    case 'e-mail-uri':
      return <GenericPage title="E-mail-uri" icon="📧" description="Managementul campaniilor de email" />;
    
    case 'rapoarte':
      return <GenericPage title="Rapoarte" icon="📈" description="Rapoarte și analize de business" />;
    
    case 'media':
      return <GenericPage title="Media" icon="🖼️" description="Galerie media și documente" />;
    
    case 'obiective':
      return <GenericPage title="Obiective" icon="🎯" description="Obiective de vânzări și performanță" />;
    
    case 'automatizari':
      return <GenericPage title="Automatizari" icon="⚙️" description="Automatizări și workflow-uri" />;
    
    case 'documente':
      return <GenericPage title="Documente" icon="📄" description="Arhiva de documente și contracte" />;
    
    case 'facturi':
      return <GenericPage title="Facturi" icon="💰" description="Managementul facturilor și plăților" />;
    
    case 'setari':
      return <GenericPage title="Setari" icon="⚙️" description="Configurări sistem și preferințe" />;
    
    default:
      return <PanouPrincipal />;
  }
}
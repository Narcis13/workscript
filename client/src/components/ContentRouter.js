import { jsx as _jsx } from "react/jsx-runtime";
import { PanouPrincipal } from './pages/PanouPrincipal';
import { Contacte } from './pages/Contacte';
import { GenericPage } from './pages/GenericPage';
import { AgentiAI } from './pages/AgentiAI';
import { Automatizari } from './pages/Automatizari';
export function ContentRouter({ currentRoute }) {
    switch (currentRoute) {
        case 'panou-principal':
            return _jsx(PanouPrincipal, {});
        case 'agenti-ai':
            return _jsx(AgentiAI, {});
        case 'contacte':
            return _jsx(Contacte, {});
        case 'activitati':
            return _jsx(GenericPage, { title: "Activitati", icon: "\uD83D\uDCCB", description: "Gestionarea activit\u0103\u021Bilor \u0219i task-urilor" });
        case 'leads':
            return _jsx(GenericPage, { title: "Leads", icon: "\uD83C\uDFAF", description: "Managementul lead-urilor \u0219i prospects" });
        case 'cereri':
            return _jsx(GenericPage, { title: "Cereri", icon: "\uD83D\uDCDD", description: "Procesarea cererilor \u0219i solicit\u0103rilor" });
        case 'proprietati':
            return _jsx(GenericPage, { title: "Proprietati", icon: "\uD83C\uDFE0", description: "Catalogul propriet\u0103\u021Bilor imobiliare" });
        case 'acp':
            return _jsx(GenericPage, { title: "ACP", icon: "\uD83C\uDFE2", description: "Asocia\u021Bii de coproprietari" });
        case 'anunturi-particulari':
            return _jsx(GenericPage, { title: "Anunturi Particulari", icon: "\uD83D\uDCE2", description: "Anun\u021Buri postate de particulari" });
        case 'ansamburi':
            return _jsx(GenericPage, { title: "Ansamburi", icon: "\uD83C\uDFD8\uFE0F", description: "Ansamburi reziden\u021Biale \u0219i comerciale" });
        case 'e-mail-uri':
            return _jsx(GenericPage, { title: "E-mail-uri", icon: "\uD83D\uDCE7", description: "Managementul campaniilor de email" });
        case 'rapoarte':
            return _jsx(GenericPage, { title: "Rapoarte", icon: "\uD83D\uDCC8", description: "Rapoarte \u0219i analize de business" });
        case 'media':
            return _jsx(GenericPage, { title: "Media", icon: "\uD83D\uDDBC\uFE0F", description: "Galerie media \u0219i documente" });
        case 'obiective':
            return _jsx(GenericPage, { title: "Obiective", icon: "\uD83C\uDFAF", description: "Obiective de v\u00E2nz\u0103ri \u0219i performan\u021B\u0103" });
        case 'automatizari':
            return _jsx(Automatizari, {});
        case 'documente':
            return _jsx(GenericPage, { title: "Documente", icon: "\uD83D\uDCC4", description: "Arhiva de documente \u0219i contracte" });
        case 'facturi':
            return _jsx(GenericPage, { title: "Facturi", icon: "\uD83D\uDCB0", description: "Managementul facturilor \u0219i pl\u0103\u021Bilor" });
        case 'setari':
            return _jsx(GenericPage, { title: "Setari", icon: "\u2699\uFE0F", description: "Configur\u0103ri sistem \u0219i preferin\u021Be" });
        default:
            return _jsx(PanouPrincipal, {});
    }
}

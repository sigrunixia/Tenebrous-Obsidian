import { mountBackToTop } from './features/back-to-top';
import { registerBases } from './features/bases';
import { registerCanvas } from './features/canvas';
import { mountSiteDragon } from './features/site-dragon';
import { mountSocialLinks } from './features/social-links';
import { stripUnresolvedLinks } from './features/unresolved-links';

// One call per feature, in the order the original script ran them.
stripUnresolvedLinks();
registerBases();
registerCanvas();
mountSocialLinks();
mountSiteDragon();
mountBackToTop();

import { mountBackToTop } from './features/back-to-top';
import { registerBases } from './features/bases';
import { mountSocialLinks } from './features/social-links';
import { stripUnresolvedLinks } from './features/unresolved-links';

// One call per feature, in the order the original script ran them.
stripUnresolvedLinks();
registerBases();
mountSocialLinks();
mountBackToTop();

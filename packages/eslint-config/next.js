import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import base from './base.js';

/** Next.js App Router: Next's own rules on top of the shared base. */
export default [...base, ...nextVitals, ...nextTs, prettier];

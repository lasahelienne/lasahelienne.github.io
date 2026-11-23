# La Sahélienne : simulateur de devis

Site public du simulateur de devis du cabinet d'architecture La Sahélienne.

- `index.html` : version publique (part entreprise et honoraires fixés selon le standing).

Adresse officielle : https://devis-estimatif.lasahelienne-architecture.com/

## DELS (appli personnelle, hors ligne)

- `dels/` : appli DELS (Devis Estimatif La Sahélienne), installable, utilisable sans Internet. Adresse : /dels/ (non indexée).
- `dels/index.html` et `dels/sw.js` sont générés : modifier `index.html` (prix, calculs) ou `dels/src/*`, puis lancer `node tools/build-dels.mjs`.

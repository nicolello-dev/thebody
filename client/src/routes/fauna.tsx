import React, { useEffect, useState } from 'react';
import '../components/homepage.css';
import '../components/fauna.css';

/** Debug overlay image path (public/) */
const OVERLAY = '/tyrannosaurusrex.png';
const ANIM_MS = 1200; // 1.2s matches CSS transitions
const HOLO_MS = 680; // holo animation duration (ms)

// Configurazione colonna DNA
const DNA_TOP = 76; // px dal bordo superiore
const DNA_BOTTOM = 200; // px dal bordo inferiore
const DNA_DENSITY = 1; // 1 = originale; 1.5 => +50% GIF
const DNA_EXTRA = 1; // aggiungi forzatamente N elementi

// Converte il nome risorsa in un filename: spazi -> trattini, minuscole, rimuove accenti/simboli
const slugifyFileName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // rimuove diacritici
    .toLowerCase()
    .trim()
    .replace(/&/g, 'e')
    .replace(/[^a-z0-9]+/g, '-') // sequenze non alfanumeriche -> '-'
    .replace(/^-+|-+$/g, '');

const faunaData = {
  nome: 'Tyrannosaurus Rex',
  slotPreDescrizione: [
    { label: 'Significato', value: 'Lucertola Re' },
    { label: 'Ordine', value: 'Saurischia' },
    { label: 'Famiglia', value: 'Tirannosauridae' },
    { label: 'Genere', value: 'Tyrannosaurus' },
  ],
  descrizione:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  slotPostDescrizione: [
    { label: 'Categoria', value: 'Carnivoro' },
    { label: 'Dieta', value: 'Preda viva' },
    { label: 'Attitudine', value: 'Aggressiva' },
    { label: 'Socialità', value: 'Solitaria' },
    { label: 'Habitat', value: 'Foreste / Pianure' },
    { label: 'Addestrabilità', value: 'Alta' },
  ],
  resource1: { name: 'Carne rossa (cruda)' },
  resource2: { name: 'Ossa' },
  resource3: { name: 'Pelle' },
  resource4: null,
  resource5: null,
  resource6: null,
  // Statistiche fisiche e resistenze
  weight: '8',
  length: '12',
  height: '5',
  walkSpeed: '20',
  swimSpeed: '—',
  flySpeed: '—',
  contResist: '5',
  perfResist: '2',
  tempResist: '10',
  chimResist: '7',
  // Genoma
  sorgente: 'Fossile',
  gene: {
    nome: 'TRX-Alpha',
    probabilitaEstrazione: '62%',
    compatibilita: '45%',
    image: '/genetest.png',
    descrizione:
      "Sequenza clonata dal campione principale. Stabilità elevata nelle prime fasi di incubazione; richiede cofattori minerali specifici per l'espressione completa. Tendenza a mutazioni puntiformi sotto stress termico prolungato.",
  },
};

export default function Fauna() {
  const [isExpanding, setIsExpanding] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [overlayHolo, setOverlayHolo] = useState(false);
  const [dnaCount, setDnaCount] = useState(0);
  const [dnaImgH, setDnaImgH] = useState<number | null>(null);
  const [dnaOverlap, setDnaOverlap] = useState(0); // px di sovrapposizione verticale
  // nessuna misurazione necessaria per la descrizione: è un pannello a larghezza fissa (491px)

  // preload overlay e holo una volta
  useEffect(() => {
    const img = new Image();
    img.src = OVERLAY;
    setOverlayHolo(true);
    const t = setTimeout(() => setOverlayHolo(false), HOLO_MS + 40);
    return () => clearTimeout(t);
  }, []);

  // Calcola quante bg-dna.gif entrano tra DNA_TOP e DNA_BOTTOM
  useEffect(() => {
    let cancelled = false;
    const dna = new Image();
    dna.src = '/bg-dna.gif';
    const compute = (naturalH: number) => {
      const avail = Math.max(0, window.innerHeight - DNA_TOP - DNA_BOTTOM);
      const density = Math.max(0.01, DNA_DENSITY);
      const step = naturalH > 0 ? naturalH / density : 0; // distanza verticale target tra immagini
      const count = step > 0 ? Math.floor(avail / step) + DNA_EXTRA : 0;
      // sovrapposizione necessaria tra immagini per comprimere entro l'altezza disponibile
      const overlapPx =
        naturalH > 0 && density > 1 ? Math.max(0, naturalH - step) : 0;
      if (!cancelled) {
        setDnaImgH(naturalH);
        setDnaCount(Math.max(0, count));
        setDnaOverlap(Math.round(overlapPx));
      }
    };
    if (dna.complete) {
      // alcuni browser popolano naturalHeight solo dopo onload; fallback
      const h = dna.naturalHeight || 0;
      compute(h);
    } else {
      dna.onload = () => compute(dna.naturalHeight || 0);
      dna.onerror = () => compute(0);
    }
    const onResize = () => {
      if (dnaImgH) compute(dnaImgH);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
    };
  }, [dnaImgH, showNew, DNA_TOP, DNA_BOTTOM, DNA_DENSITY, DNA_EXTRA]);

  const resources = [
    faunaData.resource1,
    faunaData.resource2,
    faunaData.resource3,
    faunaData.resource4,
    faunaData.resource5,
    faunaData.resource6,
  ];
  const resourcesCount = resources.filter(r => r).length;

  const handleExpand = () => {
    if (isExpanding || isCollapsing) return;
    setIsExpanding(true);
    setTimeout(() => {
      setShowNew(true);
      setIsExpanding(false);
    }, ANIM_MS);
  };

  const handleReduce = () => {
    if (!showNew || isExpanding || isCollapsing) return;
    setIsCollapsing(true);
    setTimeout(() => {
      setShowNew(false);
      setIsCollapsing(false);
    }, 1000);
  };

  const gridClass =
    isExpanding || showNew ? 'move-up' : isCollapsing ? 'move-down' : '';
  const overlayClass = `${gridClass} ${overlayHolo ? 'holo' : ''}`.trim();

  return (
    <div className='fauna-page' aria-live='polite'>
      {/* sfondo griglia */}
      <img
        src='/bg-grid.png'
        className={`fauna-grid ${gridClass}`}
        alt='grid overlay'
      />

      {/* overlay holo */}
      <img
        src={OVERLAY}
        className={`fauna-grid-overlay ${overlayClass}`}
        alt='overlay hologram'
      />

      {/* PAGINA VECCHIA */}
      {!showNew && (
        <div className={`fauna-container ${isExpanding ? 'move-up' : ''}`}>
          <div className='fauna-title'>
            <div className='title-wrapper'>
              <img src='/bg-title.png' alt='title icon' />
              <div className='title-text'>
                <h1>{faunaData.nome}</h1>
              </div>
            </div>
          </div>

          <div className='fauna-slots'>
            {faunaData.slotPreDescrizione.map((slot, idx) => (
              <div className='fauna-slot' key={idx}>
                <img src='/bg-slot.png' className='slot-bg' alt='slot bg' />
                <span className='slot-label'>{slot.label.toUpperCase()}</span>
                <span className='slot-value'>
                  {String(slot.value).toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          <div className='fauna-description-container'>
            <img
              src='/bg-description.png'
              className='fauna-description-bg'
              alt='description bg'
            />
            <div className='fauna-description-text'>
              {faunaData.descrizione}
            </div>
          </div>

          <div className='fauna-subtitle'>
            <div className='subtitle-wrapper'>
              <img src='/bg-subtitle.png' alt='subtitle bg' />
              <div className='subtitle-text'>BIOPRINT</div>
            </div>
          </div>

          <div className='fauna-slots'>
            {faunaData.slotPostDescrizione.map((slot, idx) => (
              <div className='fauna-slot' key={idx}>
                <img src='/bg-slot.png' className='slot-bg' alt='slot bg' />
                <span className='slot-label'>{slot.label.toUpperCase()}</span>
                <span className='slot-value'>
                  {String(slot.value).toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          <div
            className='fauna-expand'
            onClick={handleExpand}
            role='button'
            aria-label='Espandi'
          >
            <div className='expand-wrapper'>
              <img src='/bg-expand.png' className='expand-bg' alt='expand bg' />
              <div className='expand-text'>_{faunaData.nome}//</div>
            </div>
          </div>
        </div>
      )}

      {/* PAGINA NUOVA: colonne con divisore */}
      {showNew && (
        <div
          className={`new-page ${isCollapsing ? 'slide-out' : ''}`}
          role='region'
          aria-label='Nuova documentazione'
        >
          <div className='fauna-columns-wrapper'>
            {/* COLONNA SINISTRA */}
            <div className='fauna-col-left'>
              {/* Subtitle */}
              <div className='fauna-subtitle'>
                <div className='subtitle-wrapper'>
                  <img src='/bg-subtitle.png' alt='subtitle bg' />
                  <div className='subtitle-text'>Sopravvivenza</div>
                </div>
              </div>
              {/* Slot */}
              <div className='fauna-slots'>
                <div className='fauna-slot'>
                  <img src='/bg-slot.png' className='slot-bg' alt='slot bg' />
                  <span className='slot-label'>RISORSE ESTRAIBILI</span>
                  <span className='slot-value'>{resourcesCount}</span>
                </div>
              </div>
              {/* Scrollbar verticale con item */}
              <div className='fauna-items-scroll'>
                {resources.map((res, idx) => {
                  const itemBg = res ? '/bg-item.png' : '/bg-noitem.png';
                  const itemIndex = idx + 1;
                  const itemName = res ? res.name : '';
                  const itemImg = res
                    ? `/${slugifyFileName(itemName)}.png`
                    : null;

                  return (
                    <div key={idx} className='fauna-item-slot'>
                      <img
                        src={itemBg}
                        className='item-bg'
                        alt={itemName || 'nessuna risorsa'}
                      />
                      {itemImg && (
                        <img
                          src={itemImg}
                          alt={itemName}
                          className='item-icon'
                        />
                      )}
                      <div className='item-name'>{itemName}</div>
                    </div>
                  );
                })}
              </div>

              {/* Subtitle GENOMA che si estende fino al bordo destro dei dati fisici */}
              <div
                className='genome-subtitle'
                role='heading'
                aria-level={2}
                aria-label='Genoma'
              >
                <div className='subtitle-wrapper'>
                  <img src='/bg-subtitle.png' alt='genome subtitle bg' />
                  <div className='subtitle-text'>Genoma</div>
                </div>
              </div>

              {/* Sezione GENOMA: riga con 4 slot (sx) + descrizione (dx) */}
              <div className='genome-row'>
                {/* Colonna sinistra: 2 slot (Nome, Sorgente) + Descrizione sotto */}
                <div className='genome-left'>
                  <div className='fauna-slots genome-slots'>
                    <div className='fauna-slot'>
                      <img
                        src='/bg-slot.png'
                        className='slot-bg'
                        alt='slot bg'
                      />
                      <span className='slot-label'>NOME</span>
                      <span className='slot-value'>
                        {String(faunaData.gene?.nome ?? '—').toUpperCase()}
                      </span>
                    </div>
                    <div className='fauna-slot'>
                      <img
                        src='/bg-slot.png'
                        className='slot-bg'
                        alt='slot bg'
                      />
                      <span className='slot-label'>SORGENTE</span>
                      <span className='slot-value'>
                        {String(faunaData.sorgente ?? '—').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {/* Slot Descrizione sotto gli slot, stessa larghezza (491px) */}
                  <div
                    className='genome-description-container'
                    aria-label='Descrizione gene'
                  >
                    <img
                      src='/bg-description.png'
                      className='genome-description-bg'
                      alt='description bg'
                    />
                    <div className='genome-description-text'>
                      {faunaData.gene?.descrizione || '—'}
                    </div>
                  </div>
                </div>

                {/* Colonna destra: divisore + skin pattern + genomedetect affianco */}
                <div className='genome-right'>
                  <div className='genome-divider' aria-hidden />
                  <div className='genome-right-stack'>
                    {/* Overlay: gene image sopra a bg-genomedetect */}
                    <div className='genome-detect-wrap'>
                      <img
                        className='genome-detect-inline'
                        src='/bg-genomedetect.png'
                        alt='Genome detect'
                        draggable={false}
                      />
                      <img
                        className='genome-gene-img'
                        src={faunaData.gene?.image || '/genetest.png'}
                        alt='Gene preview'
                        draggable={false}
                      />
                      {/* Overlay valori: probabilità di estrazione e compatibilità */}
                      <div className='genome-info-overlay' aria-hidden='false'>
                        <div className='genome-info genome-prob'>
                          {String(
                            faunaData.gene?.probabilitaEstrazione ?? '—',
                          ).toUpperCase()}
                        </div>
                        <div className='genome-info genome-comp'>
                          {String(
                            faunaData.gene?.compatibilita ?? '—',
                          ).toUpperCase()}
                        </div>
                      </div>
                      {/* Reduce sovrapposto a bg-genomedetect */}
                      <div className='genome-reduce-overlay'>
                        <div
                          className='fauna-reduce genome-reduce'
                          onClick={handleReduce}
                          role='button'
                          aria-label='Riduci'
                        >
                          <div className='reduce-wrapper'>
                            <img
                              src='/bg-reduce.png'
                              className='reduce-bg'
                              alt='reduce bg'
                            />
                            <div className='reduce-text'>
                              _{faunaData.nome}//
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rettangolo divisore */}
            <div className='fauna-divider' aria-hidden />

            {/* COLONNA DESTRA */}
            <div className='fauna-col-right'>
              <div className='fauna-right-row'>
                <div className='stats-block'>
                  <div className='fauna-subtitle'>
                    <div className='subtitle-wrapper'>
                      <img src='/bg-subtitle.png' alt='subtitle bg' />
                      <div className='subtitle-text'>Statistiche</div>
                    </div>
                  </div>
                  {/* Pannello caratteristiche fisiche */}
                  <div className='traits-panel'>
                    <img
                      src='/bg-physicaltraits.png'
                      alt='physical traits'
                      className='traits-image'
                    />
                    <div className='traits-overlay' aria-hidden='false'>
                      {/* Griglia 3x2: dimensioni + velocità */}
                      <div className='traits-grid traits-grid-sizes'>
                        {[
                          { value: faunaData.weight },
                          { value: faunaData.length },
                          { value: faunaData.height },
                          { value: faunaData.walkSpeed },
                          { value: faunaData.swimSpeed },
                          { value: faunaData.flySpeed },
                        ].map((t, i) => (
                          <div key={i} className='trait-box'>
                            <span className='trait-value'>{t.value}</span>
                          </div>
                        ))}
                      </div>
                      {/* Griglia 2x2: resistenze */}
                      <div className='traits-grid traits-grid-resists'>
                        {[
                          { value: faunaData.contResist },
                          { value: faunaData.perfResist },
                          { value: faunaData.tempResist },
                          { value: faunaData.chimResist },
                        ].map((t, i) => (
                          <div key={i} className='trait-box'>
                            <span className='trait-value'>{t.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Nuovo rettangolo alla destra di "Statistiche" con gli stessi parametri del divisore */}
                <div className='fauna-divider' aria-hidden />
              </div>
            </div>
          </div>

          {/* Colonna verticale di bg-dna.gif ripetuti (fissi rispetto alla pagina) */}
          <div
            className='dna-stack'
            aria-hidden
            style={{ top: DNA_TOP, bottom: DNA_BOTTOM }}
          >
            {Array.from({ length: dnaCount }).map((_, i) => (
              <img
                key={i}
                src='/bg-dna.gif'
                alt=''
                className='dna-img'
                draggable={false}
                style={i === 0 ? undefined : { marginTop: -dnaOverlap }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

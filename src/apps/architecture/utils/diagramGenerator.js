/**
 * Generates Excalidraw elements from a scenario's step components.
 * Layout: each step = a labeled row of component boxes, steps stacked vertically.
 */

const STEP_COLORS = [
  { stroke: '#3b82f6', bg: '#1e3358' },
  { stroke: '#14b8a6', bg: '#0d2e2b' },
  { stroke: '#a855f7', bg: '#2a1a3e' },
  { stroke: '#f59e0b', bg: '#3a2700' },
  { stroke: '#22c55e', bg: '#0d2e1a' },
  { stroke: '#ef4444', bg: '#3a0d0d' },
];

export function generateDiagramElements(scenario) {
  const elements = [];
  let idCounter = 1;
  const makeId = () => `gen-${idCounter++}`;

  const BOX_W = 148;
  const BOX_H = 44;
  const H_GAP = 10;
  const V_STEP_GAP = 56;
  const LABEL_H = 22;
  const COLS = 4;
  const LEFT_MARGIN = 40;

  let yOffset = 30;

  scenario.steps.forEach((step, si) => {
    const color = STEP_COLORS[si % STEP_COLORS.length];
    const comps = step.components || [];
    const rows = Math.ceil(comps.length / COLS);

    // Step label
    const labelId = makeId();
    elements.push({
      id: labelId,
      type: 'text',
      x: LEFT_MARGIN,
      y: yOffset,
      width: COLS * (BOX_W + H_GAP),
      height: LABEL_H,
      angle: 0,
      strokeColor: color.stroke,
      backgroundColor: 'transparent',
      fillStyle: 'hachure',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 90,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: idCounter * 11,
      version: 1,
      versionNonce: idCounter * 11,
      isDeleted: false,
      boundElements: [],
      updated: 1714000000000,
      link: null,
      locked: true,
      text: `${si + 1}. ${step.title}`,
      fontSize: 13,
      fontFamily: 2,
      textAlign: 'left',
      verticalAlign: 'top',
      containerId: null,
      originalText: `${si + 1}. ${step.title}`,
      lineHeight: 1.25,
      baseline: 13,
    });

    yOffset += LABEL_H + 6;

    // Component boxes
    comps.forEach((comp, ci) => {
      const row = Math.floor(ci / COLS);
      const col = ci % COLS;
      const x = LEFT_MARGIN + col * (BOX_W + H_GAP);
      const y = yOffset + row * (BOX_H + 8);

      const rectId = makeId();
      const textId = makeId();

      elements.push({
        id: rectId,
        type: 'rectangle',
        x,
        y,
        width: BOX_W,
        height: BOX_H,
        angle: 0,
        strokeColor: color.stroke,
        backgroundColor: color.bg,
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: { type: 3 },
        seed: idCounter * 13,
        version: 1,
        versionNonce: idCounter * 13,
        isDeleted: false,
        boundElements: [{ type: 'text', id: textId }],
        updated: 1714000000000,
        link: null,
        locked: true,
      });

      elements.push({
        id: textId,
        type: 'text',
        x: x + 6,
        y: y + 4,
        width: BOX_W - 12,
        height: BOX_H - 8,
        angle: 0,
        strokeColor: '#e2e8f0',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: idCounter * 17,
        version: 1,
        versionNonce: idCounter * 17,
        isDeleted: false,
        boundElements: [],
        updated: 1714000000000,
        link: null,
        locked: true,
        text: comp.length > 26 ? comp.slice(0, 24) + '…' : comp,
        fontSize: 11,
        fontFamily: 2,
        textAlign: 'center',
        verticalAlign: 'middle',
        containerId: rectId,
        originalText: comp,
        lineHeight: 1.25,
        baseline: 11,
      });
    });

    yOffset += rows * (BOX_H + 8) + V_STEP_GAP;
  });

  return elements;
}

// Generates the original sample illustrations used by the mock listings.
// Output: public/images/site/*.svg (used by the app) and scripts/sample-art/livestock/*.svg
// (source art for the backend's sample listing images, which were rendered from
// these to WebP in backend/livestock/sample_data/images). Run: npm run generate:images
// Every image is drawn from code in this file, so the project owns them outright.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outputDir = (file) => (file.startsWith('site/') ? join(here, '..', 'public', 'images') : join(here, 'sample-art'))

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SCENES = {
  morning: { skyTop: '#CFE3DA', skyBottom: '#F4EEDC', sun: '#FBE7A1', hillFar: '#A9C3A0', hillNear: '#7FA36F', ground: '#9DBB6B', groundDark: '#7E9F52' },
  noon: { skyTop: '#B9DDF0', skyBottom: '#EEF6F2', sun: '#FFF4C2', hillFar: '#9DBF97', hillNear: '#6C985E', ground: '#A7C46A', groundDark: '#86A64E' },
  golden: { skyTop: '#F2C98B', skyBottom: '#F8E9C8', sun: '#FFE08A', hillFar: '#B7A77A', hillNear: '#8E9A5C', ground: '#BDB46A', groundDark: '#9C9550' },
  dry: { skyTop: '#D7E4EA', skyBottom: '#F6EFDF', sun: '#FFF1BF', hillFar: '#C2B48E', hillNear: '#A99A6A', ground: '#CDB97E', groundDark: '#B19E62' },
  highland: { skyTop: '#C4D7D9', skyBottom: '#EDF1E8', sun: '#F7EEC6', hillFar: '#8FAE95', hillNear: '#5E8A63', ground: '#8DB466', groundDark: '#6E944C' },
}

function scene(s, r, { tree = false, fence = false, width = 800 } = {}) {
  const sunX = 120 + r() * (width - 240)
  const far = `M0,300 C${width * 0.2},${250 + r() * 30} ${width * 0.45},${280 + r() * 20} ${width * 0.6},${265 + r() * 25} S${width * 0.9},${255 + r() * 30} ${width},${285} L${width},600 L0,600 Z`
  const near = `M0,${350 + r() * 15} C${width * 0.25},${320 + r() * 20} ${width * 0.5},${355 + r() * 15} ${width * 0.75},${330 + r() * 20} S${width},${345} ${width},${350} L${width},600 L0,600 Z`
  let out = `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.skyTop}"/><stop offset="1" stop-color="${s.skyBottom}"/></linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.ground}"/><stop offset="1" stop-color="${s.groundDark}"/></linearGradient>
  </defs>
  <rect width="${width}" height="600" fill="url(#sky)"/>
  <circle cx="${sunX.toFixed(0)}" cy="${(90 + r() * 50).toFixed(0)}" r="46" fill="${s.sun}" opacity="0.9"/>
  <path d="${far}" fill="${s.hillFar}"/>
  <path d="${near}" fill="${s.hillNear}"/>
  <rect y="400" width="${width}" height="200" fill="url(#ground)"/>
  <path d="M0,402 C${width * 0.3},392 ${width * 0.7},410 ${width},398 L${width},420 L0,420 Z" fill="${s.ground}"/>`
  if (tree) {
    const tx = r() > 0.5 ? 90 + r() * 80 : width - 170 - r() * 80
    out += `
  <g fill="${s.hillNear}" opacity="0.95">
    <path d="M${tx},400 L${tx + 6},300 L${tx + 14},300 L${tx + 20},400 Z" fill="#6B5A43"/>
    <path d="M${tx + 10},310 L${tx - 30},282 M${tx + 10},310 L${tx + 52},280" stroke="#6B5A43" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="${tx + 10}" cy="272" rx="92" ry="22" fill="#4F7444"/>
    <ellipse cx="${tx - 20}" cy="262" rx="46" ry="14" fill="#5B8350"/>
  </g>`
  }
  if (fence) {
    let posts = ''
    for (let x = 20; x < width; x += 90) posts += `<rect x="${x}" y="360" width="8" height="70" rx="2" fill="#8A7354"/>`
    out += `
  <g opacity="0.85">${posts}
    <path d="M0,375 H${width} M0,402 H${width}" stroke="#8A7354" stroke-width="3"/>
  </g>`
  }
  for (let i = 0; i < 26; i++) {
    const x = r() * width
    const y = 430 + r() * 160
    out += `<path d="M${x.toFixed(0)},${y.toFixed(0)} l4,-14 l3,14 l4,-10 l2,10" fill="none" stroke="${s.groundDark}" stroke-width="2" stroke-linecap="round"/>`
  }
  return out
}

const COATS = {
  holstein: { base: '#F5F2EC', patch: '#1F1E1C', head: '#F5F2EC', muzzle: '#E9B9AE', legs: '#F5F2EC', patches: 6 },
  holsteinDark: { base: '#1F1E1C', patch: '#F5F2EC', head: '#1F1E1C', muzzle: '#3A3533', legs: '#F5F2EC', patches: 4 },
  ayrshire: { base: '#F7F1E6', patch: '#9A4A2C', head: '#F7F1E6', muzzle: '#E6B3A3', legs: '#F7F1E6', patches: 5 },
  jersey: { base: '#B98A57', patch: '#9C7044', head: '#7E5A39', muzzle: '#2E2722', legs: '#9C7044', patches: 0 },
  guernsey: { base: '#D69A4F', patch: '#F7F1E6', head: '#D69A4F', muzzle: '#EBC3A6', legs: '#F7F1E6', patches: 3 },
  boran: { base: '#E9E4DA', patch: '#A9A296', head: '#CFC8BB', muzzle: '#3B3633', legs: '#C9C2B4', patches: 0, shade: '#9F978A' },
  sahiwal: { base: '#A9583A', patch: '#8D452B', head: '#93492F', muzzle: '#3A2B26', legs: '#8D452B', patches: 0 },
  ankole: { base: '#7B3424', patch: '#5E2618', head: '#6A2C1E', muzzle: '#2F2420', legs: '#5E2618', patches: 0 },
  simmental: { base: '#B4673A', patch: '#F5EEE2', head: '#F5EEE2', muzzle: '#E8BCA6', legs: '#F5EEE2', patches: 2 },
  zebu: { base: '#8B7A66', patch: '#6E604F', head: '#776857', muzzle: '#2F2A26', legs: '#6E604F', patches: 0 },
  crossFawn: { base: '#C49B6C', patch: '#2A2623', head: '#C49B6C', muzzle: '#3C3430', legs: '#C49B6C', patches: 3 },
}

const BODY = 'M260,300 C260,255 300,246 360,248 L500,250 C548,252 566,276 566,312 L566,350 C566,386 540,396 500,396 L322,396 C282,396 260,376 260,345 Z'
const NECK = 'M520,262 C548,248 584,250 604,262 L598,330 C580,350 548,352 528,342 Z'
const HEAD = 'M590,258 C612,250 638,262 646,288 L660,334 C664,352 652,362 638,360 L612,356 C598,354 590,345 586,332 L578,292 C576,276 580,262 590,258 Z'

function cow(coat, r, { hump = false, horns = 'none', udder = false, bull = false } = {}) {
  const c = COATS[coat]
  let patches = ''
  for (let i = 0; i < c.patches; i++) {
    const cx = 280 + r() * 360
    const cy = 250 + r() * 130
    const rx = 28 + r() * 40
    const ry = 18 + r() * 28
    patches += `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}" transform="rotate(${(r() * 60 - 30).toFixed(0)} ${cx.toFixed(0)} ${cy.toFixed(0)})"/>`
  }
  if (c.shade) {
    patches += `<linearGradient id="shade-${coat}" x1="0" y1="0" x2="1" y2="0"><stop offset="0.45" stop-color="${c.shade}" stop-opacity="0"/><stop offset="0.8" stop-color="${c.shade}" stop-opacity="0.75"/></linearGradient>`
    patches += `<rect x="240" y="200" width="440" height="220" fill="url(#shade-${coat})"/>`
  }

  const leg = (x, shade) => `
    <rect x="${x}" y="370" width="24" height="98" rx="9" fill="${c.legs}"/>
    ${shade ? `<rect x="${x}" y="370" width="24" height="98" rx="9" fill="#000" opacity="0.12"/>` : ''}
    <rect x="${x - 1}" y="456" width="26" height="14" rx="4" fill="#2B2420"/>`

  let hornSvg = ''
  if (horns === 'short') hornSvg = `<path d="M600,258 C604,244 612,236 622,232" fill="none" stroke="#EDE3CF" stroke-width="7" stroke-linecap="round"/>`
  if (horns === 'curved') hornSvg = `<path d="M598,258 C596,236 610,220 630,222" fill="none" stroke="#EDE3CF" stroke-width="8" stroke-linecap="round"/>`
  if (horns === 'lyre') hornSvg = `
    <path d="M598,258 C560,230 552,170 590,120" fill="none" stroke="#EADFC8" stroke-width="15" stroke-linecap="round"/>
    <path d="M614,256 C650,220 690,190 700,130" fill="none" stroke="#DCCFB4" stroke-width="13" stroke-linecap="round"/>`

  const humpSvg = hump ? `<path d="M470,256 C478,214 532,210 542,258 Z" fill="${c.base}"/>` : ''
  const dewlap = hump ? `<path d="M540,330 C548,372 568,380 590,342 Z" fill="${c.head}"/>` : ''
  const udderSvg = udder ? `<ellipse cx="372" cy="398" rx="30" ry="16" fill="#E7B2A6"/><path d="M356,410 v10 M372,412 v10 M388,410 v10" stroke="#D99A8C" stroke-width="5" stroke-linecap="round"/>` : ''
  const bullNeck = bull ? `<path d="M500,250 C530,226 586,236 600,262 L560,300 Z" fill="${c.head}"/>` : ''
  const ring = bull ? `<circle cx="652" cy="356" r="7" fill="none" stroke="#C9A64A" stroke-width="3"/>` : ''

  return `
  <g>
    <ellipse cx="420" cy="470" rx="210" ry="16" fill="#000" opacity="0.14"/>
    ${leg(322, true)}${leg(536, true)}
    <path d="M262,284 C238,300 240,360 246,420" fill="none" stroke="${c.legs}" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="246" cy="428" rx="8" ry="14" fill="#2B2420"/>
    <clipPath id="coat-clip"><path d="${BODY}"/><path d="${NECK}"/><path d="${HEAD}"/></clipPath>
    ${humpSvg}
    <path d="${BODY}" fill="${c.base}"/>
    ${bullNeck}
    <path d="${NECK}" fill="${c.base}"/>
    ${dewlap}
    <path d="${HEAD}" fill="${c.head}"/>
    <g clip-path="url(#coat-clip)" fill="${c.patch}">${patches}</g>
    ${udderSvg}
    ${leg(290, false)}${leg(504, false)}
    <ellipse cx="596" cy="266" rx="24" ry="9" fill="${c.head}" transform="rotate(-18 596 266)"/>
    <ellipse cx="594" cy="267" rx="15" ry="5" fill="#000" opacity="0.15" transform="rotate(-18 594 267)"/>
    ${hornSvg}
    <circle cx="624" cy="290" r="4.5" fill="#1A1614"/>
    <ellipse cx="644" cy="346" rx="17" ry="13" fill="${c.muzzle}"/>
    <ellipse cx="650" cy="346" rx="3" ry="2" fill="#000" opacity="0.4"/>
    ${ring}
  </g>`
}

function svg(viewBox, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${title}"><title>${title}</title>${body}
</svg>
`
}

function animalImages({ name, seed, coat, opts, scenes, label }) {
  const views = [
    { suffix: 1, sceneKey: scenes[0], flip: false, tree: false, fence: true, frame: [170, 130, 560, 420], caption: 'side view' },
    { suffix: 2, sceneKey: scenes[1], flip: true, tree: true, fence: false, frame: [80, 100, 640, 480], caption: 'in the paddock' },
    { suffix: 3, sceneKey: scenes[0], flip: false, tree: false, fence: false, frame: [400, 150, 360, 270], caption: 'head and shoulders' },
  ]
  const scale = opts.calf ? 0.72 : 1
  // Calves are drawn smaller around the ground point, so pull the frame in with them.
  const fit = ([x, y, w, h]) => {
    if (scale === 1) return `${x} ${y} ${w} ${h}`
    const k = 0.8
    return `${(420 + (x - 420) * k).toFixed(0)} ${(470 + (y - 470) * k).toFixed(0)} ${(w * k).toFixed(0)} ${(h * k).toFixed(0)}`
  }
  return views.map((v) => {
    const r = rng(seed * 10 + v.suffix)
    const coatRand = rng(seed)
    const animal = cow(coat, coatRand, opts)
    const flip = v.flip ? 'translate(800,0) scale(-1,1)' : ''
    const calf = scale !== 1 ? `translate(${420 * (1 - scale)},${470 * (1 - scale)}) scale(${scale})` : ''
    const shift = v.suffix === 2 ? 'translate(-40,10)' : ''
    const body = `${scene(SCENES[v.sceneKey], r, { tree: v.tree, fence: v.fence })}
  <g transform="${flip}"><g transform="${shift}"><g transform="${calf}">${animal}</g></g></g>`
    return { file: `livestock/${name}-${v.suffix}.svg`, content: svg(fit(v.frame), body, `Illustration of ${label}, ${v.caption}`) }
  })
}

// Keep in sync with src/data/livestock.js (image file names and labels).
const ANIMALS = [
  { name: 'friesian-heifer-njoro', seed: 11, coat: 'holstein', opts: { udder: true }, scenes: ['morning', 'highland'], label: 'a Friesian heifer' },
  { name: 'ayrshire-cow-othaya', seed: 12, coat: 'ayrshire', opts: { udder: true, horns: 'short' }, scenes: ['highland', 'noon'], label: 'an Ayrshire cow' },
  { name: 'jersey-heifer-limuru', seed: 13, coat: 'jersey', opts: { udder: true }, scenes: ['noon', 'morning'], label: 'a Jersey heifer' },
  { name: 'guernsey-cow-olkalou', seed: 14, coat: 'guernsey', opts: { udder: true, horns: 'short' }, scenes: ['highland', 'golden'], label: 'a Guernsey cow' },
  { name: 'boran-steer-nanyuki', seed: 15, coat: 'boran', opts: { hump: true, horns: 'short' }, scenes: ['dry', 'golden'], label: 'a Boran steer' },
  { name: 'sahiwal-steer-kajiado', seed: 16, coat: 'sahiwal', opts: { hump: true, horns: 'short' }, scenes: ['dry', 'noon'], label: 'a Sahiwal-cross steer' },
  { name: 'boran-bull-narok', seed: 17, coat: 'boran', opts: { hump: true, horns: 'curved', bull: true }, scenes: ['golden', 'dry'], label: 'a Boran bull' },
  { name: 'friesian-bull-eldoret', seed: 18, coat: 'holsteinDark', opts: { bull: true }, scenes: ['noon', 'highland'], label: 'a Friesian bull' },
  { name: 'sahiwal-bull-machakos', seed: 19, coat: 'sahiwal', opts: { hump: true, horns: 'curved', bull: true }, scenes: ['dry', 'golden'], label: 'a Sahiwal bull' },
  { name: 'friesian-calf-bomet', seed: 20, coat: 'holstein', opts: { calf: true }, scenes: ['highland', 'morning'], label: 'a Friesian heifer calf' },
  { name: 'ayrshire-calf-kericho', seed: 21, coat: 'ayrshire', opts: { calf: true }, scenes: ['morning', 'highland'], label: 'an Ayrshire bull calf' },
  { name: 'ankole-cow-migori', seed: 22, coat: 'ankole', opts: { horns: 'lyre', udder: true }, scenes: ['golden', 'noon'], label: 'an Ankole cow' },
  { name: 'simmental-steer-meru', seed: 23, coat: 'simmental', opts: { horns: 'short' }, scenes: ['noon', 'highland'], label: 'a Simmental-cross steer' },
  { name: 'jersey-cross-calf-githunguri', seed: 24, coat: 'crossFawn', opts: { calf: true }, scenes: ['morning', 'noon'], label: 'a Jersey-Friesian cross calf' },
]

function siteImages() {
  const files = []
  const categories = [
    { name: 'category-dairy', coat: 'holstein', opts: { udder: true }, sceneKey: 'highland', label: 'a dairy cow' },
    { name: 'category-beef', coat: 'boran', opts: { hump: true, horns: 'short' }, sceneKey: 'dry', label: 'a beef steer' },
    { name: 'category-bulls', coat: 'sahiwal', opts: { hump: true, horns: 'curved', bull: true }, sceneKey: 'golden', label: 'a bull' },
    { name: 'category-calves', coat: 'jersey', opts: { calf: true }, sceneKey: 'morning', label: 'a calf' },
  ]
  categories.forEach((c, i) => {
    const r = rng(100 + i)
    const scale = c.opts.calf ? 0.8 : 1
    const calf = scale !== 1 ? `translate(${420 * (1 - scale)},${470 * (1 - scale)}) scale(${scale})` : ''
    const body = `${scene(SCENES[c.sceneKey], r, { fence: i % 2 === 0, tree: i % 2 === 1 })}
  <g transform="${calf}">${cow(c.coat, rng(200 + i), c.opts)}</g>`
    files.push({ file: `site/${c.name}.svg`, content: svg('140 120 600 450', body, `Illustration of ${c.label}`) })
  })

  const r = rng(999)
  const herd = [
    { coat: 'boran', opts: { hump: true, horns: 'short' }, t: 'translate(330,40) scale(0.62)' },
    { coat: 'holstein', opts: { udder: true }, t: 'translate(-60,60) scale(0.9)' },
    { coat: 'jersey', opts: { calf: true }, t: 'translate(420,215) scale(0.55)' },
    { coat: 'sahiwal', opts: { hump: true, horns: 'curved', bull: true }, t: 'translate(1300,40) scale(-0.95,0.95)' },
  ]
  let body = scene(SCENES.golden, r, { tree: true, width: 1200 })
  herd.forEach((h, i) => {
    body += `<g transform="${h.t}">${cow(h.coat, rng(300 + i), h.opts).replaceAll('coat-clip', `coat-clip-${i}`)}</g>`
  })
  files.push({ file: 'site/hero-herd.svg', content: svg('160 150 880 450', body, 'Illustration of cattle grazing on a Kenyan farm at sunset') })
  return files
}

const all = [...ANIMALS.flatMap(animalImages), ...siteImages()]
for (const { file, content } of all) {
  const path = join(outputDir(file), file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}
console.log(`Wrote ${all.length} images`)

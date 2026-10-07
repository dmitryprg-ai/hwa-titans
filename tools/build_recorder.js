// Builds tools/hwa_recorder.js from tools/hwa_recorder.template.js, filling in the screen signatures
// straight from hwa_extension.js - so the recorder checks exactly what the macro checks.
// Run after changing either file:  node tools/build_recorder.js
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const source = fs.readFileSync(path.join(root, 'hwa_extension.js'), 'utf8')
const template = fs.readFileSync(path.join(__dirname, 'hwa_recorder.template.js'), 'utf8')

// the signatures are plain literals: const screenXxx = [ {x, y, color, threshold?}, ... ]
const screens = {}
const declaration = /^ {4}const ((?:screen|popup)\w*) = \[/gm
let match
while ((match = declaration.exec(source))) {
    const name = match[1]
    let depth = 0, end = match.index + match[0].length - 1
    for (; end < source.length; end++) {
        if (source[end] === '[') depth++
        else if (source[end] === ']' && --depth === 0) break
    }
    const literal = source.slice(match.index + match[0].length - 1, end + 1)
    const points = new Function('return ' + literal)()
    if (!Array.isArray(points) || !points.every(p => typeof p.x === 'number' && typeof p.y === 'number' && Array.isArray(p.color))) {
        throw new Error(name + ' does not look like a screen signature')
    }
    screens[name] = points.map(p => p.threshold == null ? { x: p.x, y: p.y, color: p.color } : { x: p.x, y: p.y, color: p.color, threshold: p.threshold })
}

if (!screens.screenHome || !screens.screenGuild) throw new Error('screenHome / screenGuild not found - did the script change shape?')

const body = '{\n' + Object.entries(screens)
    .map(([name, points]) => '        ' + name + ': ' + JSON.stringify(points))
    .join(',\n') + '\n    }'

fs.writeFileSync(path.join(__dirname, 'hwa_recorder.js'), template.replace('__SCREENS__', body))
console.log('tools/hwa_recorder.js: ' + Object.keys(screens).length + ' screen signatures, ' +
    Object.values(screens).reduce((n, p) => n + p.length, 0) + ' points')

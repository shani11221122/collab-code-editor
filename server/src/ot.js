// server/src/ot.js  (aur isi ko client mein bhi copy/import karenge)

/**
 * transform(opA, opB)
 * Maan lein: dono operations SAME document state se shuru hue the.
 * opB pehle apply ho chuka hai. Ab hum opA ko is tarah adjust karte hain
 * ke woh naye (opB-applied) document pe bhi sahi kaam kare.
 */
function transform(opA, opB) {
  // Case 1: Dono INSERT hain
  if (opA.type === 'insert' && opB.type === 'insert') {
    if (opA.pos < opB.pos) {
      // opA, opB se pehle wali jagah insert kar raha hai — kuch change nahi
      return opA;
    } else if (opA.pos > opB.pos) {
      // opB ne pehle text daal diya hai, isliye opA ki position 
      // opB ke insert kiye hue text ki length jitni aage khisak jayegi
      return { ...opA, pos: opA.pos + opB.char.length };
    } else {
      // Same position — tie-breaking rule: hum "server priority" use karenge
      // (opB ko priority milegi, opA ko aage khiska denge)
      return { ...opA, pos: opA.pos + opB.char.length };
    }
  }

  // Case 2: opA INSERT hai, opB DELETE hai
  if (opA.type === 'insert' && opB.type === 'delete') {
    if (opA.pos <= opB.pos) {
      return opA; // deletion opA ki jagah ke baad hui, koi asar nahi
    } else if (opA.pos > opB.pos + opB.length) {
      // opA ki position, delete hue hisse ke baad hai — utni jagah peeche khisak jao
      return { ...opA, pos: opA.pos - opB.length };
    } else {
      // opA usi range mein tha jo delete ho gaya — us range ke start pe le aao
      return { ...opA, pos: opB.pos };
    }
  }

  // Case 3: opA DELETE hai, opB INSERT hai
  if (opA.type === 'delete' && opB.type === 'insert') {
    if (opB.pos <= opA.pos) {
      // Insert humari delete-range se pehle hua — position aage khisak jayegi
      return { ...opA, pos: opA.pos + opB.char.length };
    } else {
      return opA; // insert humari range ke baad hai, koi asar nahi
    }
  }

  // Case 4: Dono DELETE hain
  if (opA.type === 'delete' && opB.type === 'delete') {
    if (opA.pos >= opB.pos + opB.length) {
      // Humara delete, opB ke delete hue hisse ke baad start hota hai
      return { ...opA, pos: opA.pos - opB.length };
    } else if (opA.pos + opA.length <= opB.pos) {
      return opA; // koi overlap nahi
    } else {
      // Overlap ho raha hai — simplified handling: length adjust karo
      const newPos = Math.min(opA.pos, opB.pos);
      const overlap = Math.min(opA.pos + opA.length, opB.pos + opB.length) - Math.max(opA.pos, opB.pos);
      const newLength = Math.max(0, opA.length - Math.max(0, overlap));
      return { ...opA, pos: newPos, length: newLength };
    }
  }
}

module.exports = { transform };
class Genealogy {
  constructor() {
    this.records = [];
    this.childMap = new Map();
    this.parentMap = new Map();
  }

  add(childGenomeId, parentGenomeIds, type) {
    this.records.push({
      child: childGenomeId,
      parents: parentGenomeIds,
      type: type
    });
    for(const parentGenomeId of parentGenomeIds) {
      this.childMap.set(parentGenomeId, [...(this.childMap.get(parentGenomeId) || []), childGenomeId]);
      this.parentMap.set(childGenomeId, [...(this.parentMap.get(childGenomeId) || []), parentGenomeId]);
    }
  }

  toArray() {
    return JSON.parse(JSON.stringify(this.records));
  }

  getChildren(parentGenomeId) {
    return this.childMap.get(parentGenomeId) || [];
  }

  getParents(childGenomeId) {
    return this.parentMap.get(childGenomeId) || [];
  }

  sortRecordsByType(typesOrder = ['offspring', 'elite', 'hallOfFame']) {
    const typeOrderMap = {}
    for(let i = 0; i < typesOrder.length; i++) {
      typeOrderMap[typesOrder[i]] = i;
    }
    
    this.records.sort((a, b) => {
      const orderA = typeOrderMap.hasOwnProperty(a.type) ? typeOrderMap[a.type] : typesOrder.length;
      const orderB = typeOrderMap.hasOwnProperty(b.type) ? typeOrderMap[b.type] : typesOrder.length;
      return orderA - orderB;
    });
  }
}
  
export default Genealogy;
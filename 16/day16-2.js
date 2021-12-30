const hexCharToBinaryString = (char) => {
    let num = parseInt(char, 10);
    if (Number.isNaN(num)) {
        num = char.charCodeAt(0) - 55;
    }
    return num.toString(2).padStart(4, '0');
};

const hexStringToBinaryString = (str) => str
    .split('')
    .map((c) => hexCharToBinaryString(c))
    .reduce((p, c) => p + c);

const getVersion = (str) => parseInt(str.slice(0, 3), 2);

const getTypeId = (str) => parseInt(str.slice(3, 6), 2);

const isOperator = (str) => getTypeId(str) !== 4;

const getLengthTypeId = (str) => parseInt(str.slice(6, 7), 2);

const getLengthInBits = (str) => parseInt(str.slice(7, 22), 2);

const getLengthInPackets = (str) => parseInt(str.slice(7, 18), 2);

const getLiteralValue = (str) => {
    const prefixStart = 6;
    let nextPrefix = Number(str.slice(prefixStart, prefixStart + 1));
    let sliceStart = prefixStart + 1;
    let sliceEnd = sliceStart + 4;
    let binary = str.slice(sliceStart, sliceEnd);
    while (nextPrefix) {
        nextPrefix = Number(str.slice(sliceEnd, sliceEnd + 1));
        sliceStart += 5;
        sliceEnd += 5;
        binary += str.slice(sliceStart, sliceEnd);
    }
    return parseInt(binary, 2);
};

const recursiveSplitPoint = (packet, total = 0) => {
    const result = total + packet.splitPoint;
    if (!packet.subpackets?.length) return result;
    const subtotals = packet.subpackets.map((s) => recursiveSplitPoint(s, 0));
    return subtotals.reduce((p, c) => p + c, result);
};

class Packet {
    constructor(str) {
        this.str = str;
        this.version = getVersion(str);
        this.typeId = getTypeId(str);
        this.operator = isOperator(str);
        if (this.operator) {
            this.lengthTypeId = getLengthTypeId(this.str);
            this.length = this.lengthTypeId
                ? getLengthInPackets(this.str)
                : getLengthInBits(this.str);
            this.splitPoint = this.lengthTypeId ? 18 : 22;
            this.subpackets = this.createSubPackets(str);
        } else {
            this.literalValue = getLiteralValue(str);
            this.splitPoint = this.literalSplitPacket();
        }
    }

    literalSplitPacket() {
        const prefixStart = 6;
        let nextPrefix = Number(this.str.slice(prefixStart, prefixStart + 1));
        let sliceStart = prefixStart + 1;
        let sliceEnd = sliceStart + 4;
        while (nextPrefix) {
            nextPrefix = Number(this.str.slice(sliceEnd, sliceEnd + 1));
            sliceStart += 5;
            sliceEnd += 5;
        }
        return sliceEnd;
    }

    createSubPackets() {
        const subpackets = [];
        if (this.lengthTypeId) {
            // length is in packets
            let substring = this.str.slice(this.splitPoint);
            while (subpackets.length < this.length) {
                const currentSubPacket = new Packet(substring);
                subpackets.push(currentSubPacket);
                // substring = substring.slice(currentSubPacket.splitPoint);
                substring = substring.slice(recursiveSplitPoint(currentSubPacket));
            }
        } else {
            // length is in bits
            let substring = this.str.slice(this.splitPoint, this.splitPoint + this.length);
            while (substring) {
                const currentSubPacket = new Packet(substring);
                subpackets.push(currentSubPacket);
                // substring = substring.slice(currentSubPacket.splitPoint);
                substring = substring.slice(recursiveSplitPoint(currentSubPacket));
            }
        }
        return subpackets;
    }
}

const getOperatorFunction = (packet) => {
    const sum = (arr) => arr.reduce((a, b) => a + b, 0);
    const product = (arr) => arr.reduce((a, b) => a * b, 1);
    const minimum = (arr) => arr.reduce((a, b) => (a < b ? a : b));
    const maximum = (arr) => arr.reduce((a, b) => (a > b ? a : b));
    const greaterThan = (arr) => Number(arr[0] > arr[1]);
    const lessThan = (arr) => Number(arr[0] < arr[1]);
    const equalTo = (arr) => Number(arr[0] === arr[1]);
    switch (packet.typeId) {
    case 0:
        return sum;
    case 1:
        return product;
    case 2:
        return minimum;
    case 3:
        return maximum;
    case 5:
        return greaterThan;
    case 6:
        return lessThan;
    case 7:
        return equalTo;
    default:
        return null;
    }
};

const evaluate = (packet) => {
    if (!packet.operator) return packet.literalValue;
    const opFun = getOperatorFunction(packet);
    const subValues = packet.subpackets.map((s) => evaluate(s));
    return opFun(subValues);
};

const part2 = 'A059141803C0008447E897180401F82F1E60D80021D11A3DC3F300470015786935BED80A5DB5002F69B4298A60FE73BE41968F48080328D00427BCD339CC7F431253838CCEFF4A943803D251B924EC283F16D400C9CDB3180213D2D542EC01092D77381A98DA89801D241705C80180960E93469801400F0A6CEA7617318732B08C67DA48C27551C00F972830052800B08550A277416401A5C913D0043D2CD125AC4B1DB50E0802059552912E9676931530046C0141007E3D4698E20008744D89509677DBF5759F38CDC594401093FC67BACDCE66B3C87380553E7127B88ECACAD96D98F8AC9E570C015C00B8E4E33AD33632938CEB4CD8C67890C01083B800E5CBDAB2BDDF65814C01299D7E34842E85801224D52DF9824D52DF981C4630047401400042E144698B2200C4328731CA6F9CBCA5FBB798021259B7B3BBC912803879CD67F6F5F78BB9CD6A77D42F1223005B8037600042E25C158FE0008747E8F50B276116C9A2730046801F29BC854A6BF4C65F64EB58DF77C018009D640086C318870A0C01D88105A0B9803310E2045C8CF3F4E7D7880484D0040001098B51DA0980021F17A3047899585004E79CE4ABD503005E610271ED4018899234B64F64588C0129EEDFD2EFBA75E0084CC659AF3457317069A509B97FB3531003254D080557A00CC8401F8791DA13080391EA39C739EFEE5394920C01098C735D51B004A7A92F6A0953D497B504F200F2BC01792FE9D64BFA739584774847CE26006A801AC05DE180184053E280104049D10111CA006300E962005A801E2007B80182007200792E00420051E400EF980192DC8471E259245100967FF7E6F2CF25DBFA8593108D342939595454802D79550C0068A72F0DC52A7D68003E99C863D5BC7A411EA37C229A86EBBC0CB802B331FDBED13BAB92080310265296AFA1EDE8AA64A0C02C9D49966195609C0594223005B80152977996D69EE7BD9CE4C1803978A7392ACE71DA448914C527FFE140';
const binaryPart2 = hexStringToBinaryString(part2);
const packetPart2 = new Packet(binaryPart2);
const result = evaluate(packetPart2);
console.log(result);

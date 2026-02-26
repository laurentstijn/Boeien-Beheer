var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var STATIONS = [
    { id: "0456117010", stationNo: "04zes01a-1066", name: "Prosperpolder", lat: 51.3483272650923, lng: 4.23793225487478 },
    { id: "0454635010", stationNo: "04zes14a-1066", name: "Kallo", lat: 51.2679979571716, lng: 4.29852383884503 },
    { id: "0454018010", stationNo: "04zes21a-1066", name: "Antwerpen", lat: 51.227468146743, lng: 4.39991370684368 },
    { id: "0456055010", stationNo: "04BS-WIN-AFW-1095", name: "Rupelmonde", lat: 51.1359646843388, lng: 4.32230864155543 },
    { id: "0454067010", stationNo: "04BS-RUP-1095", name: "Boom", lat: 51.0868580992141, lng: 4.35368553727916 },
    { id: "0455522010", stationNo: "04zes36a-1066", name: "Temse", lat: 51.1228087597494, lng: 4.21867338754706 },
    { id: "04102372010", stationNo: "04zes39a-1066", name: "Driegoten", lat: 51.0925568254825, lng: 4.17099518412599 }
];
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var _loop_1, _i, STATIONS_1, st;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _loop_1 = function (st) {
                        var url, res, data, hwSeriesId_1, e_1;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 3, , 4]);
                                    url = "https://www.waterinfo.vlaanderen.be/tsmpub/KiWIS/KiWIS?service=kisters&type=queryServices&request=getTimeSeriesList&station_no=".concat(st.stationNo, "&format=json");
                                    return [4 /*yield*/, fetch(url)];
                                case 1:
                                    res = _b.sent();
                                    return [4 /*yield*/, res.json()];
                                case 2:
                                    data = _b.sent();
                                    hwSeriesId_1 = null;
                                    data.forEach(function (row) {
                                        if (row[4] === 'Astro.Pv.HW') {
                                            hwSeriesId_1 = row[3];
                                        }
                                    });
                                    if (hwSeriesId_1) {
                                        console.log("{ name: \"".concat(st.name, "\", astroHW_id: \"").concat(hwSeriesId_1, "\", lat: ").concat(st.lat, ", lng: ").concat(st.lng, " },"));
                                    }
                                    else {
                                        console.log("".concat(st.name, ": NOT FOUND"));
                                    }
                                    return [3 /*break*/, 4];
                                case 3:
                                    e_1 = _b.sent();
                                    console.error("Error ".concat(st.name));
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, STATIONS_1 = STATIONS;
                    _a.label = 1;
                case 1:
                    if (!(_i < STATIONS_1.length)) return [3 /*break*/, 4];
                    st = STATIONS_1[_i];
                    return [5 /*yield**/, _loop_1(st)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
run();

"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_1 = require("@supabase/supabase-js");
var dotenv = require("dotenv");
dotenv.config({ path: '.env.local' });
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
var supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, allBuoys, buoysError, _b, plannedEntries, planError, plannedBuoyIds, today, overdueHoogWaterBuoys, _i, overdueHoogWaterBuoys_1, b, url, response, data, measurements, validWindows, _c, measurements_1, _d, timestampStr, level, dateObj, hour, min;
        var _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    console.log("Fetching buoys...");
                    return [4 /*yield*/, supabase
                            .from('deployed_buoys')
                            .select('*')
                            .in('status', ['OK', 'Niet OK', 'Aandacht'])];
                case 1:
                    _a = _f.sent(), allBuoys = _a.data, buoysError = _a.error;
                    if (buoysError) {
                        console.error("Buoys error:", buoysError);
                        return [2 /*return*/];
                    }
                    console.log("Fetching planned entries...");
                    return [4 /*yield*/, supabase
                            .from('planning_entries')
                            .select('buoy_id')
                            .gte('planned_date', new Date().toISOString().split('T')[0])];
                case 2:
                    _b = _f.sent(), plannedEntries = _b.data, planError = _b.error;
                    if (planError) {
                        console.error("Plan error:", planError);
                        return [2 /*return*/];
                    }
                    plannedBuoyIds = new Set(plannedEntries.map(function (p) { return p.buoy_id; }));
                    today = new Date().toISOString().split('T')[0];
                    overdueHoogWaterBuoys = allBuoys.filter(function (b) {
                        return b.status !== 'Hidden' &&
                            b.status !== 'Maintenance' &&
                            b.tideRestriction === 'Hoog water' &&
                            b.nextServiceDue &&
                            b.nextServiceDue < today &&
                            !plannedBuoyIds.has(b.id);
                    });
                    console.log("Found ".concat(overdueHoogWaterBuoys.length, " overdue 'Hoog water' buoys not yet planned."));
                    for (_i = 0, overdueHoogWaterBuoys_1 = overdueHoogWaterBuoys; _i < overdueHoogWaterBuoys_1.length; _i++) {
                        b = overdueHoogWaterBuoys_1[_i];
                        console.log("- ".concat(b.name, " (Due: ").concat(b.nextServiceDue, ")"));
                    }
                    console.log("Fetching tide data...");
                    url = "https://www.waterinfo.vlaanderen.be/tsmpub/KiWIS/KiWIS?service=kisters&type=queryServices&request=getTimeseriesValues&ts_id=04112717010&format=json&period=P14D";
                    return [4 /*yield*/, fetch(url)];
                case 3:
                    response = _f.sent();
                    return [4 /*yield*/, response.json()];
                case 4:
                    data = _f.sent();
                    measurements = ((_e = data[0]) === null || _e === void 0 ? void 0 : _e.data) || [];
                    console.log("Fetched ".concat(measurements.length, " tide measurements."));
                    validWindows = [];
                    for (_c = 0, measurements_1 = measurements; _c < measurements_1.length; _c++) {
                        _d = measurements_1[_c], timestampStr = _d[0], level = _d[1];
                        dateObj = new Date(timestampStr);
                        hour = dateObj.getHours();
                        min = dateObj.getMinutes();
                        if (hour >= 11 && hour <= 16 && level >= 4.0) {
                            validWindows.push({
                                date: dateObj.toISOString().split('T')[0],
                                time: "".concat(hour.toString().padStart(2, '0'), ":").concat(min.toString().padStart(2, '0')),
                                level: level
                            });
                        }
                    }
                    console.log("Found ".concat(validWindows.length, " valid tide windows between 11-16h."));
                    console.log(validWindows.slice(0, 5));
                    return [2 /*return*/];
            }
        });
    });
}
run();

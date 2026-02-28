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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomatedMarketMaker = void 0;
var db_1 = require("./db");
var marketMaker_1 = require("./marketMaker");
// Constants
var FEE_PERCENTAGE = 0.005; // 0.5%
var MIN_POOL_LIQUIDITY = 1.0; // Prevent divide by zero
var AutomatedMarketMaker = /** @class */ (function () {
    function AutomatedMarketMaker() {
    }
    AutomatedMarketMaker.calculatePriceImpact = function (supplyPool, demandPool, orderSize, isBuy) {
        if (supplyPool <= MIN_POOL_LIQUIDITY || demandPool <= MIN_POOL_LIQUIDITY) {
            return 0;
        }
        var k = supplyPool * demandPool;
        var newSupply;
        var newDemand;
        if (isBuy) {
            if (orderSize >= supplyPool)
                return 100;
            newSupply = supplyPool - orderSize;
            newDemand = k / newSupply;
        }
        else {
            newSupply = supplyPool + orderSize;
            newDemand = k / newSupply;
        }
        var currentPrice = demandPool / supplyPool;
        var newPrice = newDemand / newSupply;
        if (currentPrice === 0)
            return 0;
        return ((newPrice - currentPrice) / currentPrice) * 100;
    };
    AutomatedMarketMaker.executeTrade = function (order) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, assetId, type, quantity, leverage, asset, user, userPortfolios, holdingAssetIds, holdingAssets, portfolioEquity, _loop_1, _i, userPortfolios_1, p, totalEquity, maxPurchasingPower, k, executionPrice, cost, priceImpact, newSupply, newDemand, amountToPayToPool, fee, existingShort, qtyToCover, qtyToLong, marginRequired, deltaToDeduct, loanToAdd, txOps, targetShorts, totalInterestPaid, totalPrincipalRepaid, remainingToCover, _a, _b, s, canCover, loanReduction, interestReduction, costOfCovering, finalDeltaDeduction, realizedPnL, portfolioLoan, newSupply, newDemand, amountReceivedFromPool, fee, proceeds, txOps, targetPortfolios, totalInterestPaid, totalPrincipalRepaid, remainingToSell, _c, _d, p, canSell, loanReduction, interestReduction, cashNet, principalToPay, finalDeltaChange, notional, txOps;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        userId = order.userId, assetId = order.assetId, type = order.type, quantity = order.quantity;
                        leverage = order.leverage || 1;
                        if (quantity <= 0) {
                            return [2 /*return*/, { success: false, message: "Invalid quantity" }];
                        }
                        return [4 /*yield*/, db_1.default.asset.findUnique({ where: { id: assetId } })];
                    case 1:
                        asset = _e.sent();
                        return [4 /*yield*/, db_1.default.user.findUnique({ where: { id: userId } })];
                    case 2:
                        user = _e.sent();
                        if (!asset || !user)
                            return [2 /*return*/, { success: false, message: "Asset or User not found" }];
                        if (asset.supplyPool <= MIN_POOL_LIQUIDITY || asset.demandPool <= MIN_POOL_LIQUIDITY) {
                            return [2 /*return*/, { success: false, message: "Insufficient market liquidity" }];
                        }
                        return [4 /*yield*/, db_1.default.portfolio.findMany({ where: { userId: userId } })];
                    case 3:
                        userPortfolios = _e.sent();
                        holdingAssetIds = __spreadArray([], new Set(userPortfolios.map(function (p) { return p.assetId; })), true);
                        return [4 /*yield*/, db_1.default.asset.findMany({ where: { id: { in: holdingAssetIds } } })];
                    case 4:
                        holdingAssets = _e.sent();
                        portfolioEquity = 0;
                        _loop_1 = function (p) {
                            var a = holdingAssets.find(function (x) { return x.id === p.assetId; });
                            if (a) {
                                var val = p.quantity * a.basePrice;
                                if (p.isShortPosition) {
                                    portfolioEquity -= val;
                                }
                                else {
                                    portfolioEquity += val;
                                }
                            }
                        };
                        for (_i = 0, userPortfolios_1 = userPortfolios; _i < userPortfolios_1.length; _i++) {
                            p = userPortfolios_1[_i];
                            _loop_1(p);
                        }
                        totalEquity = user.deltaBalance - user.marginLoan + portfolioEquity;
                        maxPurchasingPower = Math.max(0, totalEquity) * leverage;
                        k = asset.supplyPool * asset.demandPool;
                        executionPrice = 0;
                        cost = 0;
                        priceImpact = this.calculatePriceImpact(asset.supplyPool, asset.demandPool, quantity, type === 'BUY');
                        if (!(type === 'BUY')) return [3 /*break*/, 12];
                        if (quantity >= asset.supplyPool)
                            return [2 /*return*/, { success: false, message: "Order exceeds available supply" }];
                        newSupply = asset.supplyPool - quantity;
                        newDemand = k / newSupply;
                        amountToPayToPool = newDemand - asset.demandPool;
                        executionPrice = amountToPayToPool / quantity;
                        fee = amountToPayToPool * FEE_PERCENTAGE;
                        cost = amountToPayToPool + fee;
                        existingShort = userPortfolios.find(function (p) { return p.assetId === assetId && p.isShortPosition; });
                        qtyToCover = 0;
                        qtyToLong = quantity;
                        if (existingShort && existingShort.quantity > 0) {
                            qtyToCover = Math.min(quantity, existingShort.quantity);
                            qtyToLong = quantity - qtyToCover;
                        }
                        if (cost > maxPurchasingPower && qtyToLong > 0) {
                            return [2 /*return*/, { success: false, message: "Insufficient margin. Max PP: ".concat(maxPurchasingPower.toFixed(2), ", Req: ").concat(cost.toFixed(2)) }];
                        }
                        marginRequired = cost / leverage;
                        deltaToDeduct = Math.min(user.deltaBalance, marginRequired);
                        loanToAdd = cost - deltaToDeduct;
                        txOps = [
                            db_1.default.user.update({
                                where: { id: userId },
                                data: {
                                    deltaBalance: { decrement: deltaToDeduct },
                                    marginLoan: { increment: loanToAdd }
                                }
                            }),
                            db_1.default.asset.update({
                                where: { id: assetId },
                                data: { supplyPool: newSupply, demandPool: newDemand, basePrice: executionPrice }
                            }),
                            db_1.default.transaction.create({
                                data: { userId: userId, assetId: assetId, type: 'BUY', amount: quantity, price: executionPrice, fee: fee }
                            })
                        ];
                        if (!(qtyToCover > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, db_1.default.portfolio.findMany({
                                where: { userId: userId, assetId: assetId, isShortPosition: true },
                                orderBy: { loanOriginatedAt: 'asc' }
                            })];
                    case 5:
                        targetShorts = _e.sent();
                        totalInterestPaid = 0;
                        totalPrincipalRepaid = 0;
                        remainingToCover = qtyToCover;
                        for (_a = 0, _b = targetShorts; _a < _b.length; _a++) {
                            s = _b[_a];
                            if (remainingToCover <= 0)
                                break;
                            canCover = Math.min(remainingToCover, s.quantity);
                            if (canCover === s.quantity) {
                                txOps.push(db_1.default.portfolio.delete({ where: { id: s.id } }));
                                totalInterestPaid += s.accruedInterest;
                                totalPrincipalRepaid += s.loanAmount;
                            }
                            else {
                                loanReduction = (canCover / s.quantity) * s.loanAmount;
                                interestReduction = (canCover / s.quantity) * s.accruedInterest;
                                txOps.push(db_1.default.portfolio.update({
                                    where: { id: s.id },
                                    data: {
                                        quantity: { decrement: canCover },
                                        loanAmount: { decrement: loanReduction },
                                        accruedInterest: { decrement: interestReduction }
                                    }
                                }));
                                totalInterestPaid += interestReduction;
                                totalPrincipalRepaid += loanReduction;
                            }
                            remainingToCover -= canCover;
                        }
                        costOfCovering = (qtyToCover / quantity) * cost;
                        finalDeltaDeduction = costOfCovering + totalInterestPaid;
                        realizedPnL = totalPrincipalRepaid - finalDeltaDeduction;
                        txOps.push(db_1.default.user.update({
                            where: { id: userId },
                            data: {
                                deltaBalance: { decrement: finalDeltaDeduction },
                                marginLoan: { decrement: Math.max(0, totalPrincipalRepaid) },
                                realizedPnL: { increment: realizedPnL }
                            }
                        }));
                        _e.label = 6;
                    case 6:
                        if (qtyToLong > 0) {
                            portfolioLoan = (qtyToLong / quantity) * loanToAdd;
                            // ALWAYS create a NEW portfolio record for a new trade to track separate loans/interest
                            txOps.push(db_1.default.portfolio.create({
                                data: {
                                    userId: userId,
                                    assetId: assetId,
                                    quantity: qtyToLong,
                                    averageEntryPrice: executionPrice,
                                    isShortPosition: false,
                                    leverage: leverage,
                                    liquidationPrice: executionPrice - (executionPrice / leverage) * 0.95,
                                    takeProfitPrice: order.takeProfitPrice,
                                    stopLossPrice: order.stopLossPrice,
                                    loanAmount: portfolioLoan,
                                    loanOriginatedAt: new Date(),
                                    interestLastAccruedAt: new Date()
                                }
                            }));
                        }
                        return [4 /*yield*/, db_1.default.$transaction(txOps)];
                    case 7:
                        _e.sent();
                        if (!!order.isInternal) return [3 /*break*/, 11];
                        return [4 /*yield*/, AutomatedMarketMaker.resolveCrossedLimitOrders(assetId, executionPrice)];
                    case 8:
                        _e.sent();
                        return [4 /*yield*/, AutomatedMarketMaker.checkLiquidations(assetId)];
                    case 9:
                        _e.sent();
                        return [4 /*yield*/, (0, marketMaker_1.maintainMarketMakerOrders)(assetId)];
                    case 10:
                        _e.sent();
                        _e.label = 11;
                    case 11: return [2 /*return*/, { success: true, message: "Buy executed", executionPrice: executionPrice, totalCost: cost, fee: fee, priceImpact: priceImpact }];
                    case 12:
                        if (!(type === 'SELL' || type === 'SHORT')) return [3 /*break*/, 24];
                        newSupply = asset.supplyPool + quantity;
                        newDemand = k / newSupply;
                        amountReceivedFromPool = asset.demandPool - newDemand;
                        executionPrice = amountReceivedFromPool / quantity;
                        fee = amountReceivedFromPool * FEE_PERCENTAGE;
                        proceeds = amountReceivedFromPool - fee;
                        if (!(type === 'SELL')) return [3 /*break*/, 18];
                        txOps = [];
                        return [4 /*yield*/, db_1.default.portfolio.findMany({
                                where: { userId: userId, assetId: assetId, isShortPosition: false },
                                orderBy: { loanOriginatedAt: 'asc' }
                            })];
                    case 13:
                        targetPortfolios = _e.sent();
                        totalInterestPaid = 0;
                        totalPrincipalRepaid = 0;
                        remainingToSell = quantity;
                        for (_c = 0, _d = targetPortfolios; _c < _d.length; _c++) {
                            p = _d[_c];
                            if (remainingToSell <= 0)
                                break;
                            canSell = Math.min(remainingToSell, p.quantity);
                            if (canSell === p.quantity) {
                                txOps.push(db_1.default.portfolio.delete({ where: { id: p.id } }));
                                totalInterestPaid += p.accruedInterest;
                                totalPrincipalRepaid += p.loanAmount;
                            }
                            else {
                                loanReduction = (canSell / p.quantity) * p.loanAmount;
                                interestReduction = (canSell / p.quantity) * p.accruedInterest;
                                txOps.push(db_1.default.portfolio.update({
                                    where: { id: p.id },
                                    data: {
                                        quantity: { decrement: canSell },
                                        loanAmount: { decrement: loanReduction },
                                        accruedInterest: { decrement: interestReduction }
                                    }
                                }));
                                totalInterestPaid += interestReduction;
                                totalPrincipalRepaid += loanReduction;
                            }
                            remainingToSell -= canSell;
                        }
                        cashNet = proceeds - totalInterestPaid;
                        principalToPay = totalPrincipalRepaid;
                        finalDeltaChange = cashNet - principalToPay;
                        txOps.push(db_1.default.user.update({
                            where: { id: userId },
                            data: {
                                deltaBalance: { increment: finalDeltaChange },
                                marginLoan: { decrement: Math.max(0, totalPrincipalRepaid) },
                                realizedPnL: { increment: finalDeltaChange }
                            }
                        }));
                        return [4 /*yield*/, db_1.default.$transaction(txOps)];
                    case 14:
                        _e.sent();
                        if (!!order.isInternal) return [3 /*break*/, 17];
                        return [4 /*yield*/, AutomatedMarketMaker.resolveCrossedLimitOrders(assetId, executionPrice)];
                    case 15:
                        _e.sent();
                        return [4 /*yield*/, (0, marketMaker_1.maintainMarketMakerOrders)(assetId)];
                    case 16:
                        _e.sent();
                        _e.label = 17;
                    case 17: return [2 /*return*/, { success: true, message: "Sell executed", executionPrice: executionPrice, totalCost: -proceeds, fee: fee, priceImpact: priceImpact }];
                    case 18:
                        notional = executionPrice * quantity;
                        if (notional > maxPurchasingPower) {
                            return [2 /*return*/, { success: false, message: "Insufficient margin. Max PP: ".concat(maxPurchasingPower.toFixed(2), ", Req: ").concat(notional.toFixed(2)) }];
                        }
                        txOps = [
                            db_1.default.user.update({
                                where: { id: userId },
                                data: {
                                    deltaBalance: { increment: proceeds },
                                    marginLoan: { increment: notional }
                                }
                            }),
                            db_1.default.asset.update({
                                where: { id: assetId },
                                data: { supplyPool: newSupply, demandPool: newDemand, basePrice: executionPrice }
                            }),
                            db_1.default.portfolio.create({
                                data: {
                                    userId: userId,
                                    assetId: assetId,
                                    quantity: quantity,
                                    averageEntryPrice: executionPrice,
                                    isShortPosition: true,
                                    takeProfitPrice: order.takeProfitPrice,
                                    stopLossPrice: order.stopLossPrice,
                                    leverage: leverage,
                                    liquidationPrice: executionPrice + (executionPrice / leverage) * 0.95,
                                    loanAmount: notional,
                                    loanOriginatedAt: new Date(),
                                    interestLastAccruedAt: new Date()
                                }
                            }),
                            db_1.default.transaction.create({
                                data: { userId: userId, assetId: assetId, type: 'SHORT', amount: quantity, price: executionPrice, fee: fee }
                            })
                        ];
                        return [4 /*yield*/, db_1.default.$transaction(txOps)];
                    case 19:
                        _e.sent();
                        if (!!order.isInternal) return [3 /*break*/, 23];
                        return [4 /*yield*/, AutomatedMarketMaker.resolveCrossedLimitOrders(assetId, executionPrice)];
                    case 20:
                        _e.sent();
                        return [4 /*yield*/, AutomatedMarketMaker.checkLiquidations(assetId)];
                    case 21:
                        _e.sent();
                        return [4 /*yield*/, (0, marketMaker_1.maintainMarketMakerOrders)(assetId)];
                    case 22:
                        _e.sent();
                        _e.label = 23;
                    case 23: return [2 /*return*/, { success: true, message: "Short executed", executionPrice: executionPrice, totalCost: -proceeds, fee: fee, priceImpact: priceImpact }];
                    case 24: return [2 /*return*/, { success: false, message: "Invalid trade type" }];
                }
            });
        });
    };
    AutomatedMarketMaker.resolveCrossedLimitOrders = function (assetId, startPrice) {
        return __awaiter(this, void 0, void 0, function () {
            var currentPrice, iterations, MAX_ITERATIONS, bestBuy, bestSell, executedAny, res, bestSellRefresh, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        currentPrice = startPrice;
                        iterations = 0;
                        MAX_ITERATIONS = 50;
                        console.log("[AMM] Starting order resolution for asset ".concat(assetId, " at price ").concat(startPrice.toFixed(4)));
                        _a.label = 1;
                    case 1:
                        if (!(iterations < MAX_ITERATIONS)) return [3 /*break*/, 15];
                        return [4 /*yield*/, db_1.default.limitOrder.findFirst({
                                where: { assetId: assetId, status: 'PENDING', type: { in: ['BUY', 'COVER'] }, price: { gte: currentPrice } },
                                orderBy: { price: 'desc' }
                            })];
                    case 2:
                        bestBuy = _a.sent();
                        return [4 /*yield*/, db_1.default.limitOrder.findFirst({
                                where: { assetId: assetId, status: 'PENDING', type: { in: ['SELL', 'SHORT'] }, price: { lte: currentPrice } },
                                orderBy: { price: 'asc' }
                            })];
                    case 3:
                        bestSell = _a.sent();
                        executedAny = false;
                        if (!bestBuy) return [3 /*break*/, 8];
                        console.log("[AMM] Cascade iteration ".concat(iterations, ": Found BUY order ").concat(bestBuy.id, " at ").concat(bestBuy.price));
                        return [4 /*yield*/, AutomatedMarketMaker.executeTrade({
                                userId: bestBuy.userId,
                                assetId: bestBuy.assetId,
                                type: bestBuy.type === 'COVER' ? 'BUY' : 'BUY',
                                quantity: bestBuy.quantity,
                                leverage: bestBuy.leverage,
                                isInternal: true
                            })];
                    case 4:
                        res = _a.sent();
                        if (!res.success) return [3 /*break*/, 6];
                        return [4 /*yield*/, db_1.default.limitOrder.update({ where: { id: bestBuy.id }, data: { status: 'EXECUTED' } })];
                    case 5:
                        _a.sent();
                        if (res.executionPrice)
                            currentPrice = res.executionPrice;
                        executedAny = true;
                        return [3 /*break*/, 8];
                    case 6:
                        if (!(res.message && res.message.toLowerCase().includes('insufficient'))) return [3 /*break*/, 8];
                        return [4 /*yield*/, db_1.default.limitOrder.update({ where: { id: bestBuy.id }, data: { status: 'CANCELLED' } })];
                    case 7:
                        _a.sent();
                        executedAny = true; // Still marked as "changed" to re-check others
                        _a.label = 8;
                    case 8: return [4 /*yield*/, db_1.default.limitOrder.findFirst({
                            where: { assetId: assetId, status: 'PENDING', type: { in: ['SELL', 'SHORT'] }, price: { lte: currentPrice } },
                            orderBy: { price: 'asc' }
                        })];
                    case 9:
                        bestSellRefresh = _a.sent();
                        if (!bestSellRefresh) return [3 /*break*/, 14];
                        console.log("[AMM] Cascade iteration ".concat(iterations, ": Found SELL order ").concat(bestSellRefresh.id, " at ").concat(bestSellRefresh.price));
                        return [4 /*yield*/, AutomatedMarketMaker.executeTrade({
                                userId: bestSellRefresh.userId,
                                assetId: bestSellRefresh.assetId,
                                type: bestSellRefresh.type === 'SHORT' ? 'SHORT' : 'SELL',
                                quantity: bestSellRefresh.quantity,
                                leverage: bestSellRefresh.leverage,
                                isInternal: true
                            })];
                    case 10:
                        res = _a.sent();
                        if (!res.success) return [3 /*break*/, 12];
                        return [4 /*yield*/, db_1.default.limitOrder.update({ where: { id: bestSellRefresh.id }, data: { status: 'EXECUTED' } })];
                    case 11:
                        _a.sent();
                        if (res.executionPrice)
                            currentPrice = res.executionPrice;
                        executedAny = true;
                        return [3 /*break*/, 14];
                    case 12:
                        if (!(res.message && res.message.toLowerCase().includes('insufficient'))) return [3 /*break*/, 14];
                        return [4 /*yield*/, db_1.default.limitOrder.update({ where: { id: bestSellRefresh.id }, data: { status: 'CANCELLED' } })];
                    case 13:
                        _a.sent();
                        executedAny = true;
                        _a.label = 14;
                    case 14:
                        if (!executedAny)
                            return [3 /*break*/, 15];
                        iterations++;
                        return [3 /*break*/, 1];
                    case 15:
                        if (iterations > 0) {
                            console.log("[AMM] Order resolution for asset ".concat(assetId, " completed in ").concat(iterations, " iterations."));
                        }
                        if (iterations >= MAX_ITERATIONS) {
                            console.warn("[AMM] Cascade reached MAX_ITERATIONS for asset ".concat(assetId, ". Potential infinite loop or massive volume."));
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    AutomatedMarketMaker.checkLiquidations = function (assetId) {
        return __awaiter(this, void 0, void 0, function () {
            var asset, currentPrice, portfolios, _i, _a, p, shouldLiquidate;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, db_1.default.asset.findUnique({ where: { id: assetId } })];
                    case 1:
                        asset = _b.sent();
                        if (!asset)
                            return [2 /*return*/];
                        currentPrice = asset.basePrice;
                        return [4 /*yield*/, db_1.default.portfolio.findMany({
                                where: { assetId: assetId }
                            })];
                    case 2:
                        portfolios = _b.sent();
                        _i = 0, _a = portfolios;
                        _b.label = 3;
                    case 3:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        p = _a[_i];
                        if (!p.liquidationPrice)
                            return [3 /*break*/, 5];
                        shouldLiquidate = false;
                        // Allow a tiny buffer to avoid rounding floats triggering premature liquidations
                        if (p.isShortPosition && currentPrice >= (p.liquidationPrice - 0.001)) {
                            shouldLiquidate = true;
                        }
                        else if (!p.isShortPosition && currentPrice <= (p.liquidationPrice + 0.001)) {
                            shouldLiquidate = true;
                        }
                        if (!shouldLiquidate) return [3 /*break*/, 5];
                        console.log("[LIQUIDATION] Portfolio ".concat(p.id, " (Short: ").concat(p.isShortPosition, ") for User ").concat(p.userId, " at price ").concat(currentPrice.toFixed(4), " (Liq: ").concat(p.liquidationPrice.toFixed(4), ")"));
                        return [4 /*yield*/, this.executeTrade({
                                userId: p.userId,
                                assetId: p.assetId,
                                type: p.isShortPosition ? 'BUY' : 'SELL', // Buying covers a short, Selling closes a long
                                quantity: p.quantity,
                                isInternal: true
                            })];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return AutomatedMarketMaker;
}());
exports.AutomatedMarketMaker = AutomatedMarketMaker;

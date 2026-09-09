import React from 'react';
import { Zap, TrendingDown, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export default function EfficiencyComparison({ efficiencyHistory = [] }) {
  const latest = efficiencyHistory.length > 0
    ? efficiencyHistory[efficiencyHistory.length - 1]
    : null;

  // Cumulative totals
  const totalNaive = latest ? latest.cumulativeNaive : 0;
  const totalActual = latest ? latest.cumulativeActual : 0;
  const totalSaved = latest ? latest.cumulativeSaved : 0;
  const overallPercentSaved = latest ? latest.cumulativePercentSaved : 0;

  // Max value for scaling bar graph in latest turn
  const maxTurnTokens = latest ? Math.max(latest.naiveTokens, latest.actualTokens, 100) : 100;
  const naiveTurnPercent = latest ? Math.min(100, Math.round((latest.naiveTokens / maxTurnTokens) * 100)) : 0;
  const actualTurnPercent = latest ? Math.min(100, Math.round((latest.actualTokens / maxTurnTokens) * 100)) : 0;

  return (
    <div className="flex flex-col h-full bg-[#1A1614] border border-[#2E2420] rounded-none overflow-hidden shadow-none">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-[#2E2420] bg-[#171311] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#8C1D40] border border-[#E84A27] text-[#FFB000]">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-[#FFF1D6] text-xs uppercase tracking-wide">
                Token Efficiency
              </h3>
              <span className="px-1 py-0.2 text-[9px] font-mono bg-[#12100E] text-[#FFB000] border border-[#2E2420]">
                Real BPE Counts
              </span>
            </div>
            <p className="text-[10px] text-[#8A7A70] leading-none mt-0.5">
              Measured live via gpt-tokenizer (unfabricated)
            </p>
          </div>
        </div>

        {/* Global Savings Badge */}
        {latest && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-[#8C1D40] border border-[#FF7A00] text-[#FFF1D6] text-[10px] font-mono font-bold">
            <TrendingDown className="w-3 h-3 text-[#FFB000]" />
            <span>{overallPercentSaved}% cut</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 bg-[#12100E]">
        {/* Latest Turn Comparison Card */}
        <div className="p-2.5 bg-[#1A1614] border border-[#2E2420] space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-[#FFB000] uppercase tracking-wider text-[10px]">
              {latest ? `Latest Turn (#${latest.turn})` : 'Waiting for Turn 1...'}
            </span>
            {latest && (
              <span className="font-mono text-[#FF7A00] font-semibold flex items-center gap-0.5 text-[10px]">
                <ArrowUpRight className="w-3 h-3" />
                {latest.tokensSaved} tokens saved ({latest.percentSaved}%)
              </span>
            )}
          </div>

          {/* Naive Replay Bar */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-[#8A7A70]">Naive Full History Sent:</span>
              <span className="font-mono text-[#FFF1D6] font-semibold">
                {latest ? `${latest.naiveTokens} tok` : '0 tok'}
              </span>
            </div>
            <div className="w-full bg-[#12100E] h-2 overflow-hidden border border-[#2E2420]">
              <div
                className="bg-[#8C1D40] h-full transition-all duration-300"
                style={{ width: `${latest ? naiveTurnPercent : 0}%` }}
              ></div>
            </div>
          </div>

          {/* Actual Sent Bar */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-[#8A7A70]">Actual Sent (Top 5 + Message):</span>
              <span className="font-mono text-[#FFB000] font-semibold">
                {latest ? `${latest.actualTokens} tok` : '0 tok'}
              </span>
            </div>
            <div className="w-full bg-[#12100E] h-2 overflow-hidden border border-[#2E2420]">
              <div
                className="bg-[#FF7A00] h-full transition-all duration-300"
                style={{ width: `${latest ? actualTurnPercent : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Cumulative Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-[#1A1614] border border-[#2E2420] flex flex-col">
            <span className="text-[10px] text-[#8A7A70]">Cumulative Naive</span>
            <span className="text-base font-bold font-mono text-[#FFF1D6] mt-0.5">
              {totalNaive.toLocaleString()}
            </span>
            <span className="text-[9px] text-[#8C1D40] font-mono">grows linearly</span>
          </div>

          <div className="p-2 bg-[#1A1614] border border-[#2E2420] flex flex-col">
            <span className="text-[10px] text-[#8A7A70]">Cumulative Actual</span>
            <span className="text-base font-bold font-mono text-[#FFB000] mt-0.5">
              {totalActual.toLocaleString()}
            </span>
            <span className="text-[9px] text-[#FF7A00] font-mono">bounded context</span>
          </div>

          <div className="col-span-2 p-2 bg-[#1A1614] border border-[#FF7A00]/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#8A7A70] uppercase tracking-wider block">Total Saved</span>
              <span className="text-lg font-black font-mono text-[#FFF1D6]">
                {totalSaved.toLocaleString()} <span className="text-xs font-normal text-[#FFB000]">tokens</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#8A7A70] uppercase tracking-wider block">Efficiency</span>
              <span className="text-lg font-black font-mono text-[#FF7A00]">
                {overallPercentSaved}%
              </span>
            </div>
          </div>
        </div>

        {/* Turn by Turn Table */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-[#8A7A70] uppercase tracking-wider block">
            Turn Trajectory:
          </span>
          {efficiencyHistory.length === 0 ? (
            <div className="text-center py-4 text-[#8A7A70] text-[10px] bg-[#1A1614] border border-[#2E2420]">
              Tokens record after Turn 1.
            </div>
          ) : (
            <div className="border border-[#2E2420] bg-[#1A1614] text-[10px]">
              <div className="grid grid-cols-4 p-1.5 bg-[#171311] font-mono text-[9px] text-[#8A7A70] border-b border-[#2E2420]">
                <div>Turn</div>
                <div className="text-right">Naive</div>
                <div className="text-right">Actual</div>
                <div className="text-right">Saved</div>
              </div>
              <div className="max-h-28 overflow-y-auto divide-y divide-[#2E2420]">
                {efficiencyHistory.map((item) => (
                  <div key={item.turn} className="grid grid-cols-4 p-1 font-mono text-[10px] hover:bg-[#12100E] transition">
                    <div className="text-[#FFF1D6]">#{item.turn}</div>
                    <div className="text-right text-[#8C1D40]">{item.naiveTokens}</div>
                    <div className="text-right text-[#FFB000]">{item.actualTokens}</div>
                    <div className="text-right text-[#FF7A00] font-bold">
                      +{item.tokensSaved}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Minimal Claim Callout */}
        <div className="p-2 bg-[#1A1614] border border-[#2E2420] text-[10px] text-[#8A7A70] flex items-start gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#FFB000] shrink-0 mt-0.5" />
          <p className="leading-tight">
            Naive transcripts grow continuously. This companion sends only 5 retrieved memories, keeping context bounded.
          </p>
        </div>
      </div>
    </div>
  );
}

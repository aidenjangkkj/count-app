"use client";

import React, { useEffect, useRef, useState } from "react";
import { linkBridge } from "@webview-bridge/web";
import { z } from "zod";

// 응답 스키마 정의
const BaseSchema = z.object({
  network: z.string(),
  number: z.coerce.number().int().min(1),
});
const ResponseSchema = z.union([BaseSchema, z.object({ data: BaseSchema })]);

function normalizeRaw(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  return raw;
}

export default function BridgePage() {
  const [status, setStatus] = useState("버튼 클릭 시 3초 후 결과 표시");
  const [network, setNetwork] = useState("-");
  const [number, setNumber] = useState<string | number>("-");
  const [ready, setReady] = useState(false);

  const bridgeRef = useRef<ReturnType<typeof linkBridge> | null>(null);

  // 브릿지 초기화
  useEffect(() => {
    bridgeRef.current = linkBridge({
      timeout: 3000,
      onReady: () => {
        console.log("브릿지 준비 완료");
        setReady(true);
      },
    });
    return () => {
      // 연결 실패 시 정리
      bridgeRef.current = null;
    };
  }, []);

  // 브릿지 호출
  const onClick = async () => {
    if (!bridgeRef.current) {
      setStatus("브릿지가 아직 준비되지 않았습니다.");
      return;
    }

    setStatus("네이티브 처리 중... (3초 지연)");

    // 1) 호출: 네이티브 메서드 실행
    const call = bridgeRef.current as unknown as Record<
      string,
      () => Promise<unknown>
    >;

    let raw: unknown;
    // 호출 시도
    try {
      // 'requestInfo' 메서드 호출
      raw = await call.requestInfo?.();
    } catch (e) {
      setStatus("브릿지 호출 실패");
      return;
    }

    // 2) 정규화: 문자열 → 객체
    const normalized = normalizeRaw(raw);
    const parsed = ResponseSchema.safeParse(normalized);
    if (!parsed.success) {
      setStatus("응답 형식 오류 (콘솔 로그 확인)");
      return;
    }

    // 3) 결과 처리
    const data = "data" in parsed.data ? parsed.data.data : parsed.data;
    setNetwork(data.network);
    setNumber(data.number);
    setStatus("웹뷰 렌더링 완료");
  };

  return (
    <main className="p-4 font-sans">
      <div className="mb-3 rounded-lg bg-zinc-100 px-3 py-2 font-semibold">
        <b>WebView(웹)</b> UI입니다
      </div>

      <h3 className="text-lg font-semibold">
        웹 ↔ 네이티브 브릿지 (네트워크 + 숫자)
      </h3>

      <button
        onClick={onClick}
        disabled={!ready}
        className={`mt-3 rounded-lg px-4 py-3 text-white ${
          ready ? "bg-black" : "bg-zinc-400 cursor-not-allowed"
        }`}
      >
        네이티브에 요청하기
      </button>

      <div className="mt-3 rounded-xl border border-zinc-200 p-3">
        <div className="my-1 flex justify-between">
          <div className="text-zinc-600">네트워크 상태</div>
          <div className="font-semibold">{network}</div>
        </div>
        <div className="my-1 flex justify-between">
          <div className="text-zinc-600">랜덤 숫자</div>
          <div className="font-semibold">{number}</div>
        </div>
        <div className="mt-1 text-xs text-zinc-500">{status}</div>
      </div>
    </main>
  );
}

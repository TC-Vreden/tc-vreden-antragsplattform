import { NextResponse } from "next/server";
import {
  runEbusyTestLabAction,
  type EbusyTestAction
} from "@/lib/ebusy-test-lab";

type TestLabRequest = {
  scenarioId?: string;
  action?: EbusyTestAction;
};

const allowedActions: EbusyTestAction[] = ["dry_run", "create_person"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TestLabRequest;
    const scenarioId = body.scenarioId?.trim();
    const action = body.action;

    if (!scenarioId) {
      return NextResponse.json({ message: "Testszenario fehlt." }, { status: 400 });
    }

    if (!action || !allowedActions.includes(action)) {
      return NextResponse.json({ message: "Testaktion ist ungültig." }, { status: 400 });
    }

    const result = await runEbusyTestLabAction({ scenarioId, action });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Das eBuSy-Testlabor ist fehlgeschlagen."
      },
      { status: 500 }
    );
  }
}

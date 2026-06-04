import { NextResponse } from "next/server";
import {
  internalAuthErrorResponse,
  requireInternalApiPermission
} from "@/lib/internal-auth";
import { writeInternalAuditLog } from "@/lib/internal-audit";
import {
  runEbusyTestLabAction,
  type EbusyTestAction
} from "@/lib/ebusy-test-lab";

type TestLabRequest = {
  scenarioId?: string;
  action?: EbusyTestAction;
};

const allowedActions: EbusyTestAction[] = [
  "dry_run",
  "create_management_application",
  "create_person",
  "create_person_with_attributes",
  "create_person_with_membership",
  "create_person_with_attributes_and_membership"
];

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

    const actor = await requireInternalApiPermission(
      action === "dry_run" ? "testlab.read" : "testlab.write",
      request
    );
    const result = await runEbusyTestLabAction({ scenarioId, action });

    await writeInternalAuditLog({
      actor,
      action: "testlab.run",
      entityType: "ebusy_test",
      entityId: scenarioId,
      details: {
        testAction: action,
        resultMode: result.mode,
        writeEnabled: result.writeEnabled
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    const authResponse = internalAuthErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Das eBuSy-Testlabor ist fehlgeschlagen."
      },
      { status: 500 }
    );
  }
}

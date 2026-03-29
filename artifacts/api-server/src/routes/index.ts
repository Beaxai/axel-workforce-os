import { Router, type IRouter } from "express";
import healthRouter from "./health";
import organizationsRouter from "./organizations";
import usersRouter from "./users";
import dealsRouter from "./deals";
import quotesRouter from "./quotes";
import policiesRouter from "./policies";
import commissionsRouter from "./commissions";
import contactsRouter from "./contacts";
import employeesRouter from "./employees";
import tasksRouter from "./tasks";
import notesRouter from "./notes";
import agentRegistrationsRouter from "./agent-registrations";
import rateTablesRouter from "./rate-tables";
import implementationRouter from "./implementation";
import workforceRouter from "./workforce";
import accountsRouter from "./accounts";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/organizations", organizationsRouter);
router.use("/users", usersRouter);
router.use("/deals", dealsRouter);
router.use("/quotes", quotesRouter);
router.use("/policies", policiesRouter);
router.use("/commissions", commissionsRouter);
router.use("/contacts", contactsRouter);
router.use("/employees", employeesRouter);
router.use("/tasks", tasksRouter);
router.use("/notes", notesRouter);
router.use("/agent-registrations", agentRegistrationsRouter);
router.use("/rate-tables", rateTablesRouter);
router.use("/implementation", implementationRouter);
router.use("/workforce", workforceRouter);
router.use("/accounts", accountsRouter);

export default router;

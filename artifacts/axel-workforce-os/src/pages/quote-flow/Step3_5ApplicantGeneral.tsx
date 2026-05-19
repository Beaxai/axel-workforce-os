import P2Step1Applicant from "./P2Step1Applicant";
import P2Step3GeneralInfo from "./P2Step3GeneralInfo";

export default function Step3_5ApplicantGeneral() {
  return (
    <div>
      <P2Step1Applicant />
      <div style={{ height: 24 }} />
      <P2Step3GeneralInfo />
    </div>
  );
}

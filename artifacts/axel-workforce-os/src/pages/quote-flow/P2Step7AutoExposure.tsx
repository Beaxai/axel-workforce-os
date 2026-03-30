import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import {
  FormSection, FieldGrid, FieldLabel, TextInput, NumberInput,
  YesNoToggle, RadioGroup, MultiSelect,
} from "@/components/quote-flow/FormFields";

const DELIVERY_TYPES = [
  { value: "Retail", label: "Retail" },
  { value: "Wholesale", label: "Wholesale" },
  { value: "Direct to customer", label: "Direct to customer" },
];

export default function P2Step7AutoExposure() {
  const s = useQuoteFlowStore();

  return (
    <div style={{ maxWidth: 800 }}>
      <FormSection title="Driving & Delivery Exposure">
        <FieldGrid columns={2}>
          <FieldLabel label="Delivery Mileage %">
            <RadioGroup value={s.deliveryMileagePct} onChange={(v) => s.update({ deliveryMileagePct: v })} options={["<50", "50-100", "100+", "N/A"]} />
          </FieldLabel>
          <FieldLabel label="Maximum Delivery Mileage">
            <NumberInput value={s.maxDeliveryMileage} onChange={(v) => s.update({ maxDeliveryMileage: v })} placeholder="Miles" />
          </FieldLabel>
        </FieldGrid>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Delivery Type %">
            <MultiSelect values={s.deliveryTypes} onChange={(v) => s.update({ deliveryTypes: v })} options={DELIVERY_TYPES} placeholder="Select types" />
          </FieldLabel>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 32, flexWrap: "wrap" }}>
          <FieldLabel label="All Vehicles Equipped with GPS?">
            <YesNoToggle value={s.gpsEquipped} onChange={(v) => s.update({ gpsEquipped: v })} />
          </FieldLabel>
          <FieldLabel label="All Drivers Age 25-65?">
            <YesNoToggle value={s.allDrivers2565} onChange={(v) => s.update({ allDrivers2565: v })} />
          </FieldLabel>
        </div>

        {s.allDrivers2565 === "No" && (
          <FieldGrid columns={2}>
            <FieldLabel label="# Over 65">
              <NumberInput value={s.driversOver65} onChange={(v) => s.update({ driversOver65: v })} placeholder="Count" />
            </FieldLabel>
            <FieldLabel label="Total # Drivers">
              <NumberInput value={s.totalDrivers} onChange={(v) => s.update({ totalDrivers: v })} placeholder="Count" />
            </FieldLabel>
          </FieldGrid>
        )}

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Hours of Delivery">
            <TextInput value={s.deliveryHours} onChange={(v) => s.update({ deliveryHours: v })} placeholder="e.g., 9am-5pm" />
          </FieldLabel>
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Overnight Employee Travel?">
            <YesNoToggle value={s.overnightTravel} onChange={(v) => s.update({ overnightTravel: v })} />
          </FieldLabel>
          {s.overnightTravel === "Yes" && (
            <div style={{ marginTop: 8 }}>
              <FieldLabel label="Frequency">
                <TextInput value={s.overnightFrequency} onChange={(v) => s.update({ overnightFrequency: v })} placeholder="How often?" />
              </FieldLabel>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: "0 0 12px" }}>Average Distance Per Day</h4>
          <FieldGrid columns={2}>
            <FieldLabel label="Min (miles)">
              <NumberInput value={s.avgDistanceMin} onChange={(v) => s.update({ avgDistanceMin: v })} placeholder="Min" />
            </FieldLabel>
            <FieldLabel label="Max (miles)">
              <NumberInput value={s.avgDistanceMax} onChange={(v) => s.update({ avgDistanceMax: v })} placeholder="Max" />
            </FieldLabel>
          </FieldGrid>
        </div>

        <div style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: "0 0 12px" }}>Average # Deliveries Per Day</h4>
          <FieldGrid columns={2}>
            <FieldLabel label="Min">
              <NumberInput value={s.avgDeliveriesMin} onChange={(v) => s.update({ avgDeliveriesMin: v })} placeholder="Min" />
            </FieldLabel>
            <FieldLabel label="Max">
              <NumberInput value={s.avgDeliveriesMax} onChange={(v) => s.update({ avgDeliveriesMax: v })} placeholder="Max" />
            </FieldLabel>
          </FieldGrid>
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Out of State Transport States">
            <TextInput value={s.outOfStateTransport} onChange={(v) => s.update({ outOfStateTransport: v })} placeholder="List states" />
          </FieldLabel>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 32, flexWrap: "wrap" }}>
          <FieldLabel label="Drivers Training?">
            <YesNoToggle value={s.driversTraining} onChange={(v) => s.update({ driversTraining: v })} options={["No", "Yes", "N/A"]} />
          </FieldLabel>
          <FieldLabel label="CDLs Required?">
            <YesNoToggle value={s.cdlsRequired} onChange={(v) => s.update({ cdlsRequired: v })} options={["Yes", "No", "N/A"]} />
          </FieldLabel>
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Group Transportation?">
            <YesNoToggle value={s.groupTransportation} onChange={(v) => s.update({ groupTransportation: v })} />
          </FieldLabel>
          {s.groupTransportation === "Yes" && (
            <div style={{ marginTop: 8 }}>
              <FieldLabel label="# Employees">
                <NumberInput value={s.groupTransportEmployees} onChange={(v) => s.update({ groupTransportEmployees: v })} placeholder="Count" />
              </FieldLabel>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Vehicles Company Owned?">
            <YesNoToggle value={s.vehiclesCompanyOwned} onChange={(v) => s.update({ vehiclesCompanyOwned: v })} />
          </FieldLabel>
          {s.vehiclesCompanyOwned === "Yes" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, cursor: "pointer" }}>
              <div
                onClick={() => s.update({ vehiclesUnmarked: !s.vehiclesUnmarked })}
                style={{
                  width: 18, height: 18, borderRadius: 4,
                  border: s.vehiclesUnmarked ? "none" : "2px solid rgba(255,255,255,0.2)",
                  background: s.vehiclesUnmarked ? "#E91E8C" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {s.vehiclesUnmarked && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: "#ccc" }}>Unmarked</span>
            </label>
          )}
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 32, flexWrap: "wrap" }}>
          <FieldLabel label="Vehicle Maintenance">
            <YesNoToggle value={s.vehicleMaintenance} onChange={(v) => s.update({ vehicleMaintenance: v })} options={["In-House", "Outside Vendor", "No"]} />
          </FieldLabel>
          <FieldLabel label="Distracted Driving Policy?">
            <YesNoToggle value={s.distractedDrivingPolicy} onChange={(v) => s.update({ distractedDrivingPolicy: v })} options={["No", "Yes", "N/A"]} />
          </FieldLabel>
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel label="Delivery by Bicycle/Scooter/Motorcycle?">
            <YesNoToggle value={s.bicycleDelivery} onChange={(v) => s.update({ bicycleDelivery: v })} />
          </FieldLabel>
          {s.bicycleDelivery === "Yes" && (
            <div style={{ marginTop: 8 }}>
              <FieldLabel label="Explain">
                <TextInput value={s.bicycleDeliveryExplain} onChange={(v) => s.update({ bicycleDeliveryExplain: v })} placeholder="Describe" />
              </FieldLabel>
            </div>
          )}
        </div>
      </FormSection>
    </div>
  );
}

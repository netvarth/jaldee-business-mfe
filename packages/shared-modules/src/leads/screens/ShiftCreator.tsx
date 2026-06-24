import React, { useState } from 'react';
import { Button, Input, Textarea } from '@jaldee/design-system';
import { createShift } from '../services/shiftService';
import { useSharedModulesContext } from '../../context';

/**
 * Simple demo component to create a shift.
 * Enter a JSON payload (or use the example) and submit.
 * The component will use `createShift` which normalizes and converts
 * the times to the 12‑hour format required by the backend.
 */
export default function ShiftCreator() {
  const { api } = useSharedModulesContext();
  const [payload, setPayload] = useState(
    JSON.stringify(
      {
        name: 'Normal Working Hours',
        startTime: '09:00',
        endTime: '17:30',
        graceMinutes: 30,
        halfDayThresholdMinutes: 120,
        breakMinutes: 15,
        weeklyOffDays: ['SUNDAY', 'SATURDAY'],
      },
      null,
      2
    )
  );
  const [result, setResult] = useState<string>('');

  const handleSubmit = async () => {
    try {
      const shift = JSON.parse(payload);
      const res = await createShift(shift, api);
      setResult(`Success: ${JSON.stringify(res.data)}`);
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-2">Shift Creator Demo</h2>
      <Textarea
        value={payload}
        onChange={e => setPayload(e.target.value)}
        rows={12}
        className="w-full mb-2"
      />
      <Button onClick={handleSubmit} variant="primary">
        Create Shift
      </Button>
      {result && (
        <pre className="mt-2 p-2 bg-gray-100 rounded">
          {result}
        </pre>
      )}
    </div>
  );
}

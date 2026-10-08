import { useState } from 'react';
import {
  TIMEFRAMES,
  type GeneralSettings,
  type ParamsJsonSchema,
  type StrategyConfigDto,
} from '@chart-goblin/shared';
import {
  useGeneralSettings,
  useStrategies,
  useTelegramStatus,
  useTestTelegram,
  useUpdateGeneralSettings,
  useUpdateStrategy,
} from '../api/hooks';
import {
  Button,
  Card,
  ErrorText,
  inputClass,
  PageHeader,
  Toggle,
} from '../components/ui';
import { TIMEFRAME_LABEL } from '../lib/format';

export function SettingsPage() {
  const strategies = useStrategies();
  const totalWeight = (strategies.data ?? [])
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + s.weight, 0);

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Changes apply from the next scan. Scores are triggered weight ÷ total enabled weight × 100."
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="space-y-5">
          <GeneralSettingsCard />
          <TelegramCard />
        </div>
        <Card title={`Strategies · total enabled weight ${totalWeight}`}>
          <ErrorText error={strategies.error} />
          <div className="divide-y divide-slate-800">
            {strategies.data?.map((s) => (
              // Keyed on saved values so the draft resets after a save.
              <StrategyEditor
                key={`${s.key}:${s.weight}:${JSON.stringify(s.params)}`}
                strategy={s}
                totalWeight={totalWeight}
              />
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    // Column layout pins inputs to the bottom so they align across a grid row.
    <label className="flex h-full flex-col">
      <span className="text-sm text-slate-300">{label}</span>
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      <div className="mt-auto pt-1">{children}</div>
    </label>
  );
}

function GeneralSettingsCard() {
  const { data } = useGeneralSettings();
  if (!data) return <Card title="Scanner">…</Card>;
  // Remount the form (resetting its draft) whenever the saved settings change.
  return <GeneralSettingsForm key={JSON.stringify(data)} data={data} />;
}

function GeneralSettingsForm({ data }: { data: GeneralSettings }) {
  const update = useUpdateGeneralSettings();
  const [draft, setDraft] = useState(data);
  const dirty = JSON.stringify(draft) !== JSON.stringify(data);
  const set = <K extends keyof GeneralSettings>(
    key: K,
    value: GeneralSettings[K],
  ) => setDraft({ ...draft, [key]: value });
  const num = (
    key:
      | 'minSignalScore'
      | 'minAlertScore'
      | 'minQuoteVolumeUsd'
      | 'alertCooldownCandles'
      | 'maxSignalAgeMinutes',
  ) => (
    <input
      type="number"
      className={`${inputClass} w-full`}
      value={draft[key]}
      onChange={(e) => set(key, Number(e.target.value))}
    />
  );

  return (
    <Card
      title="Scanner"
      actions={
        <Button
          variant="primary"
          disabled={!dirty || update.isPending}
          onClick={() => update.mutate(draft)}
        >
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      }
    >
      <div className="space-y-4 p-4">
        <Field label="Timeframes" hint="Scheduled scans run only on these.">
          <div className="flex gap-3">
            {TIMEFRAMES.map((tf) => (
              <label
                key={tf}
                className="flex items-center gap-1.5 text-sm text-slate-300"
              >
                <input
                  type="checkbox"
                  className="accent-emerald-500"
                  checked={draft.timeframes.includes(tf)}
                  onChange={(e) =>
                    set(
                      'timeframes',
                      e.target.checked
                        ? TIMEFRAMES.filter(
                            (t) => t === tf || draft.timeframes.includes(t),
                          )
                        : draft.timeframes.filter((t) => t !== tf),
                    )
                  }
                />
                {TIMEFRAME_LABEL[tf]}
              </label>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min signal score" hint="Lower scores are not stored.">
            {num('minSignalScore')}
          </Field>
          <Field label="Min alert score" hint="Telegram alert threshold.">
            {num('minAlertScore')}
          </Field>
          <Field label="Min 24h volume (USDT)" hint="MEXC liquidity filter.">
            {num('minQuoteVolumeUsd')}
          </Field>
          <Field
            label="Alert cooldown (candles)"
            hint="Per coin, timeframe, direction."
          >
            {num('alertCooldownCandles')}
          </Field>
          <Field
            label="Opportunity max age (min)"
            hint="Hide signals whose candle closed earlier. 0 = no limit."
          >
            {num('maxSignalAgeMinutes')}
          </Field>
        </div>
        <ErrorText error={update.error} />
        <p className="text-xs text-slate-500">
          The volume filter is applied on the next universe refresh (Coins →
          Refresh now).
        </p>
      </div>
    </Card>
  );
}

function TelegramCard() {
  const status = useTelegramStatus();
  const { data: settings } = useGeneralSettings();
  const update = useUpdateGeneralSettings();
  const test = useTestTelegram();
  const configured = status.data?.telegramConfigured;

  return (
    <Card
      title="Telegram alerts"
      actions={
        settings && (
          <Toggle
            label="Telegram alerts enabled"
            checked={settings.telegramEnabled}
            disabled={update.isPending}
            onChange={(telegramEnabled) => update.mutate({ telegramEnabled })}
          />
        )
      }
    >
      <div className="space-y-3 p-4 text-sm">
        {configured === false ? (
          <p className="text-amber-400">
            Not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in
            apps/api/.env and restart the API.
          </p>
        ) : (
          <p className="text-slate-400">
            Bot configured. Alerts are sent for new signals with score ≥{' '}
            {settings?.minAlertScore ?? '…'}.
          </p>
        )}
        <Button
          disabled={!configured || test.isPending}
          onClick={() => test.mutate()}
        >
          {test.isPending ? 'Sending…' : 'Send test message'}
        </Button>
        {test.isSuccess && (
          <p className="text-emerald-400">Test message sent.</p>
        )}
        <ErrorText error={test.error} />
      </div>
    </Card>
  );
}

function StrategyEditor({
  strategy,
  totalWeight,
}: {
  strategy: StrategyConfigDto;
  totalWeight: number;
}) {
  const update = useUpdateStrategy();
  const [weight, setWeight] = useState(strategy.weight);
  const [params, setParams] = useState(strategy.params);

  const dirty =
    weight !== strategy.weight ||
    JSON.stringify(params) !== JSON.stringify(strategy.params);
  const share =
    strategy.enabled && totalWeight > 0
      ? Math.round((strategy.weight / totalWeight) * 100)
      : 0;

  return (
    <div className={`p-4 ${strategy.enabled ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-slate-100">{strategy.name}</div>
          <div className="text-xs text-slate-500">{strategy.description}</div>
        </div>
        <Toggle
          label={`Enable ${strategy.name}`}
          checked={strategy.enabled}
          disabled={update.isPending}
          onChange={(enabled) =>
            update.mutate({ key: strategy.key, patch: { enabled } })
          }
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field
          label="Weight"
          hint={strategy.enabled ? `${share}% of score` : 'disabled'}
        >
          <input
            type="number"
            min={0}
            max={100}
            className={`${inputClass} w-full`}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
          />
        </Field>
        <ParamsForm
          schema={strategy.paramsSchema}
          value={params}
          onChange={setParams}
        />
      </div>
      {dirty && (
        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="primary"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({ key: strategy.key, patch: { weight, params } })
            }
          >
            Save
          </Button>
          <Button
            onClick={() => {
              setWeight(strategy.weight);
              setParams(strategy.params);
              update.reset();
            }}
          >
            Reset
          </Button>
        </div>
      )}
      <div className="mt-2">
        <ErrorText error={update.error} />
      </div>
    </div>
  );
}

/** Renders inputs from the strategy's JSON schema (numbers and enums). */
function ParamsForm({
  schema,
  value,
  onChange,
}: {
  schema: ParamsJsonSchema;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  return (
    <>
      {Object.entries(schema.properties).map(([key, prop]) => {
        const label = prop.description ?? key;
        const set = (v: unknown) => onChange({ ...value, [key]: v });
        if (prop.enum) {
          return (
            <Field key={key} label={label}>
              <select
                className={`${inputClass} w-full`}
                value={String(value[key])}
                onChange={(e) => set(e.target.value)}
              >
                {prop.enum.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
          );
        }
        if (prop.type === 'boolean') {
          return (
            <Field key={key} label={label}>
              <Toggle
                checked={Boolean(value[key])}
                onChange={set}
                label={label}
              />
            </Field>
          );
        }
        return (
          <Field key={key} label={label}>
            <input
              type="number"
              className={`${inputClass} w-full`}
              min={prop.minimum}
              max={prop.maximum}
              step={prop.type === 'integer' ? 1 : 'any'}
              value={value[key] as number}
              onChange={(e) =>
                set(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          </Field>
        );
      })}
    </>
  );
}

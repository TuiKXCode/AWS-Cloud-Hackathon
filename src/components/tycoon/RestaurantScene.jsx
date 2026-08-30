import React, { useMemo } from 'react';
import { CHEF_STATE, PLATE_CAPACITY, tablesFor } from '../../game/constants.js';
import AnimalCustomer from './AnimalCustomer.jsx';
import ChefSprite from './ChefSprite.jsx';
import DiningTable from './DiningTable.jsx';
import FeedbackToasts from './FeedbackToasts.jsx';
import Jungle from './Jungle.jsx';
import PrepStations from './PrepStations.jsx';
import QueueOutside from './QueueOutside.jsx';
import SceneHud from './SceneHud.jsx';
import UpgradePanel, { PatioBuilds } from './UpgradePanel.jsx';
import {
  Arch,
  Conveyor,
  DrinksCase,
  PatioGround,
  PavedFloor,
  Planters,
  PlatingBench,
} from './Scenery.jsx';

/**
 * The whole restaurant in one frame: jungle, dirt patio, stone-walled dining hall, storage
 * counters, tables and everyone standing on them.
 *
 * Every position comes from `state.layout` as a percentage of this box, and depth is handled
 * entirely by z-index derived from each thing's y. That is the trick that lets the scene match
 * the reference art without any real sprite animation: order the layers correctly and the
 * furniture does the work of making animals look seated.
 *
 * There is no UI panel on the edge of the screen. Ingredients are taken from the counters that
 * store them, the plate lives on the plating bench, and the readouts sit over the jungle
 * border — everything the player touches is somewhere in the room.
 */
export default function RestaurantScene({
  state,
  exhibitsById,
  headSources,
  questlinePoints,
  serveTargetId,
  interactive,
  onSelectCustomer,
  onBuyUpgrade,
  onFetchItem,
  onRemoveItem,
  onClearPlate,
  onPause,
  onResume,
}) {
  const { layout, chef } = state;
  const tables = tablesFor(layout, state.upgrades);

  // Everything already asked for but not yet on the bench, in the order it will arrive.
  // Memoised so the bench is not handed a fresh array on every animation frame.
  const incoming = useMemo(
    () => [...chef.carrying, ...chef.fetchQueue.map((job) => job.itemId)],
    [chef.carrying, chef.fetchQueue]
  );

  // How many of each item are already spoken for, for the counts on the picker tiles.
  const counts = useMemo(() => {
    const tally = {};
    for (const itemId of [...state.plate, ...incoming]) {
      tally[itemId] = (tally[itemId] ?? 0) + 1;
    }
    return tally;
  }, [state.plate, incoming]);

  const capacityLeft = PLATE_CAPACITY - state.plate.length - incoming.length;
  const activeStationId =
    chef.state === CHEF_STATE.FETCHING || chef.dwell > 0 ? chef.targetStationId : null;

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl border-2 border-emerald-950 shadow-2xl">
      <Jungle layout={layout} />

      <PatioGround layout={layout} />
      <PavedFloor layout={layout} />
      <Arch layout={layout} />

      <Conveyor layout={layout} />
      {state.upgrades.grillStation ? <DrinksCase layout={layout} /> : null}
      <Planters layout={layout} />

      <PatioBuilds layout={layout} upgrades={state.upgrades} />
      <UpgradePanel
        layout={layout}
        upgrades={state.upgrades}
        funds={state.funds}
        onBuy={onBuyUpgrade}
      />

      {tables.map((table) => (
        <DiningTable
          key={table.id}
          layout={layout}
          table={table}
          customers={state.customers}
        />
      ))}

      {state.customers.map((customer) => (
        <AnimalCustomer
          key={customer.id}
          layout={layout}
          customer={customer}
          exhibit={exhibitsById[customer.exhibitId]}
          photoSrc={headSources?.[customer.exhibitId] ?? null}
          isSelected={state.selectedCustomerId === customer.id}
          isServeTarget={serveTargetId === customer.id}
          onSelect={onSelectCustomer}
        />
      ))}

      <ChefSprite layout={layout} chef={chef} />

      <QueueOutside
        layout={layout}
        upcoming={state.upcoming}
        exhibitsById={exhibitsById}
        headSources={headSources}
      />

      {/* Storage last of the kitchen furniture: its pickers have to sit over everything. */}
      <PrepStations
        layout={layout}
        disabled={!interactive}
        capacityLeft={capacityLeft}
        counts={counts}
        activeStationId={activeStationId}
        onPick={onFetchItem}
      />

      <PlatingBench
        layout={layout}
        plate={state.plate}
        incoming={incoming}
        errorPulse={state.errorPulse}
        disabled={!interactive}
        onRemove={onRemoveItem}
        onClear={onClearPlate}
      />

      <SceneHud
        layout={layout}
        state={state}
        questlinePoints={questlinePoints}
        onPause={onPause}
        onResume={onResume}
      />

      <FeedbackToasts toasts={state.toasts} />
    </div>
  );
}

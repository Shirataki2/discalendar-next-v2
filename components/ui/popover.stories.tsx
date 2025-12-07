import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const meta: Meta<typeof Popover> = {
	title: "UI/Popover",
	component: Popover,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="flex items-center justify-center p-20">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">Open Popover</Button>
			</PopoverTrigger>
			<PopoverContent>
				<p className="text-sm">This is the popover content.</p>
			</PopoverContent>
		</Popover>
	),
};

export const WithForm: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">Open Settings</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80">
				<div className="grid gap-4">
					<div className="space-y-2">
						<h4 className="font-medium leading-none">Settings</h4>
						<p className="text-sm text-muted-foreground">
							Configure your preferences.
						</p>
					</div>
					<div className="grid gap-2">
						<div className="grid grid-cols-3 items-center gap-4">
							<Label htmlFor="width">Width</Label>
							<Input
								id="width"
								defaultValue="100%"
								className="col-span-2 h-8"
							/>
						</div>
						<div className="grid grid-cols-3 items-center gap-4">
							<Label htmlFor="height">Height</Label>
							<Input
								id="height"
								defaultValue="auto"
								className="col-span-2 h-8"
							/>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const AlignStart: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">Align Start</Button>
			</PopoverTrigger>
			<PopoverContent align="start">
				<p className="text-sm">This popover is aligned to the start.</p>
			</PopoverContent>
		</Popover>
	),
};

export const AlignEnd: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">Align End</Button>
			</PopoverTrigger>
			<PopoverContent align="end">
				<p className="text-sm">This popover is aligned to the end.</p>
			</PopoverContent>
		</Popover>
	),
};

export const DefaultOpen: Story = {
	render: () => (
		<Popover defaultOpen>
			<PopoverTrigger asChild>
				<Button variant="outline">Already Open</Button>
			</PopoverTrigger>
			<PopoverContent>
				<p className="text-sm">This popover opens by default.</p>
			</PopoverContent>
		</Popover>
	),
};

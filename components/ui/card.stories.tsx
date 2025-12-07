import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./card";

const meta: Meta<typeof Card> = {
	title: "UI/Card",
	component: Card,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Card className="w-[350px]">
			<CardHeader>
				<CardTitle>Card Title</CardTitle>
				<CardDescription>Card description goes here.</CardDescription>
			</CardHeader>
			<CardContent>
				<p>This is the card content area.</p>
			</CardContent>
			<CardFooter>
				<Button>Action</Button>
			</CardFooter>
		</Card>
	),
};

export const HeaderOnly: Story = {
	render: () => (
		<Card className="w-[350px]">
			<CardHeader>
				<CardTitle>Header Only Card</CardTitle>
				<CardDescription>This card has only a header section.</CardDescription>
			</CardHeader>
		</Card>
	),
};

export const ContentOnly: Story = {
	render: () => (
		<Card className="w-[350px]">
			<CardContent className="pt-6">
				<p>This card has only content, no header or footer.</p>
			</CardContent>
		</Card>
	),
};

export const WithFooter: Story = {
	render: () => (
		<Card className="w-[350px]">
			<CardHeader>
				<CardTitle>Card with Footer</CardTitle>
				<CardDescription>This card includes action buttons.</CardDescription>
			</CardHeader>
			<CardContent>
				<p>Some content here.</p>
			</CardContent>
			<CardFooter className="flex justify-between">
				<Button variant="outline">Cancel</Button>
				<Button>Submit</Button>
			</CardFooter>
		</Card>
	),
};

export const FullExample: Story = {
	render: () => (
		<Card className="w-[400px]">
			<CardHeader>
				<CardTitle>Create Event</CardTitle>
				<CardDescription>
					Add a new event to your Discord calendar.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<p className="text-sm font-medium">Event Name</p>
					<p className="text-sm text-muted-foreground">Team Meeting</p>
				</div>
				<div className="space-y-2">
					<p className="text-sm font-medium">Date & Time</p>
					<p className="text-sm text-muted-foreground">January 15, 2025 at 10:00 AM</p>
				</div>
			</CardContent>
			<CardFooter className="flex justify-end gap-2">
				<Button variant="ghost">Cancel</Button>
				<Button>Create Event</Button>
			</CardFooter>
		</Card>
	),
};

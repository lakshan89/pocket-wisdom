# The network every environment (dev, qa, prod) runs in.
#
#   internet
#      |
#   internet gateway
#      |
#   public route table (0.0.0.0/0 -> gateway)
#      |-- public subnet a  10.0.0.0/24   ALB, app
#      |-- public subnet b  10.0.1.0/24   ALB, app
#
#   private route table (local traffic only)
#      |-- private subnet a 10.0.10.0/24  RDS
#      |-- private subnet b 10.0.11.0/24  RDS
#
# There's no NAT gateway (about $32 a month). Nothing in the private subnets
# needs to reach the internet: RDS only answers the app.

# The VPC itself: a private network that is isolated until you attach a
# gateway to it.
resource "aws_vpc" "main" {
  # The address range from main.tf.
  cidr_block = local.vpc_cidr

  # Lets AWS resolve DNS names inside the VPC. On by default, set here so the
  # intent is visible.
  enable_dns_support = true

  # Gives instances DNS hostnames. RDS needs this to hand out an endpoint
  # name like pocket-wisdom-dev.xxxx.ap-south-1.rds.amazonaws.com.
  enable_dns_hostnames = true

  # The Name tag is what the console shows in its "Name" column.
  tags = { Name = local.name }
}

# The door between the VPC and the internet. Without it nothing in the VPC
# can send or receive internet traffic, even with a public IP.
resource "aws_internet_gateway" "main" {
  # Attaches the gateway to our VPC.
  vpc_id = aws_vpc.main.id

  tags = { Name = local.name }
}

# Two public subnets, one per availability zone.
resource "aws_subnet" "public" {
  # count makes 2 copies of this block; count.index is 0 then 1. Refer to
  # them as aws_subnet.public[0] and aws_subnet.public[1].
  count = length(local.azs)

  # Which VPC the subnet belongs to.
  vpc_id = aws_vpc.main.id

  # cidrsubnet(range, extra bits, number) cuts a smaller block out of the
  # VPC range. 8 extra bits turn /16 into /24 (256 addresses each).
  # Number 0 gives 10.0.0.0/24, number 1 gives 10.0.1.0/24.
  cidr_block = cidrsubnet(local.vpc_cidr, 8, count.index)

  # Pins subnet 0 to ap-south-1a and subnet 1 to ap-south-1b.
  availability_zone = local.azs[count.index]

  # Anything launched here gets a public IPv4 address automatically. The EC2
  # app (step 9) uses it to pull from ECR and read SSM without a NAT
  # gateway. Its security group still only lets the ALB in.
  map_public_ip_on_launch = true

  # Name shows the zone, e.g. pocket-wisdom-public-ap-south-1a.
  tags = { Name = "${local.name}-public-${local.azs[count.index]}" }
}

# Two private subnets, one per availability zone, for RDS.
resource "aws_subnet" "private" {
  count = length(local.azs)

  vpc_id = aws_vpc.main.id

  # Numbers 10 and 11 give 10.0.10.0/24 and 10.0.11.0/24. Starting at 10
  # leaves room to add more public subnets later without overlap.
  cidr_block = cidrsubnet(local.vpc_cidr, 8, count.index + 10)

  availability_zone = local.azs[count.index]

  # No public IPs here. Combined with the route table below, nothing in
  # these subnets is reachable from, or can reach, the internet.
  map_public_ip_on_launch = false

  tags = { Name = "${local.name}-private-${local.azs[count.index]}" }
}

# Routing rules for the public subnets. A route table decides where traffic
# leaving a subnet goes.
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  # "Any address not inside the VPC goes to the internet gateway." Traffic
  # inside 10.0.0.0/16 uses the implicit "local" route every table has.
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${local.name}-public" }
}

# A route table does nothing until it's associated with a subnet. This links
# both public subnets to the public table.
resource "aws_route_table_association" "public" {
  # One association per public subnet.
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Routing for the private subnets: no routes besides the implicit "local"
# one, so traffic can only go to other addresses inside the VPC.
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${local.name}-private" }
}

# Links both private subnets to the private table. Without this they'd
# fall back to the VPC's main route table, which is easy to change by
# accident; an explicit table keeps them private on purpose.
resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
